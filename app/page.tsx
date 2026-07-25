'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ConfidenceLine } from './components/ConfidenceLine'
import { TextArea } from './components/TextArea'
import { LoadingIndicator } from './components/LoadingIndicator'
import { PreChatContextModal, type PreChatContext } from './components/PreChatContextModal'

const EMPTY_CONTEXT: PreChatContext = { age: '', trainingAge: '', goal: '', daysPerWeek: '' }
const PRECHAT_STORAGE_KEY = 'pramana_prechat_context_v1'

function formatContextNote(context: PreChatContext): string | null {
  const parts: string[] = []
  if (context.age.trim()) parts.push(`${context.age.trim()} years old`)
  if (context.trainingAge.trim()) parts.push(`training for ${context.trainingAge.trim()} years`)
  if (context.goal.trim()) parts.push(`goal: ${context.goal.trim()}`)
  if (context.daysPerWeek.trim()) parts.push(`${context.daysPerWeek.trim()} days per week available`)
  if (parts.length === 0) return null
  return `[Background: ${parts.join(', ')}]`
}

type Result = {
  recommendation: string
  confidence: number | null
  reasoning: string
  whatWouldChangeThis: string
}

type Turn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; kind: 'text'; content: string }
  | { role: 'assistant'; kind: 'logged'; content: string }
  | { role: 'assistant'; kind: 'recommendation'; result: Result }

type ApiResponse =
  | { type: 'ask'; question: string }
  | { type: 'logged'; summary: string }
  | ({ type: 'recommendation' } & Result)
  | { error: string }

function toApiMessage(turn: Turn) {
  if (turn.role === 'user') return { role: 'user' as const, content: turn.content }
  if (turn.kind === 'text') return { role: 'assistant' as const, content: turn.content }
  if (turn.kind === 'logged') return { role: 'assistant' as const, content: turn.content }
  const confidenceText = turn.result.confidence === null ? 'not applicable' : `${turn.result.confidence}%`
  return {
    role: 'assistant' as const,
    content: `Recommendation: ${turn.result.recommendation} (confidence ${confidenceText}). Reasoning: ${turn.result.reasoning}`,
  }
}

export default function Home() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [preChatContext, setPreChatContext] = useState<PreChatContext>(EMPTY_CONTEXT)
  const [showPreChatModal, setShowPreChatModal] = useState(false)
  const [hasStoredContext, setHasStoredContext] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(PRECHAT_STORAGE_KEY)
    if (stored) {
      setPreChatContext(JSON.parse(stored))
      setHasStoredContext(true)
    } else {
      setShowPreChatModal(true)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, status])

  useEffect(() => {
    if (status === 'idle' && !showPreChatModal) composerRef.current?.focus({ preventScroll: true })
  }, [status, showPreChatModal])

  const closePreChatModal = (context: PreChatContext) => {
    localStorage.setItem(PRECHAT_STORAGE_KEY, JSON.stringify(context))
    setPreChatContext(context)
    setHasStoredContext(true)
    setShowPreChatModal(false)
  }

  // First-time dismiss (Escape/backdrop/Skip) needs to persist "seen, nothing
  // provided" so the modal doesn't nag on every reload. Reopening later via
  // "Edit context" and cancelling should just close without clobbering
  // whatever context was already saved.
  const dismissPreChatModal = () => {
    if (hasStoredContext) setShowPreChatModal(false)
    else closePreChatModal(EMPTY_CONTEXT)
  }

  const send = async (nextTurns: Turn[]) => {
    setTurns(nextTurns)
    setStatus('loading')

    try {
      const apiMessages = nextTurns.map(toApiMessage)
      // Fold pre-chat context into the first message only, invisibly -- it's
      // never shown as its own turn, just silently informs the first answer.
      if (nextTurns.length === 1) {
        const note = formatContextNote(preChatContext)
        if (note) apiMessages[0] = { ...apiMessages[0], content: `${note}\n\n${apiMessages[0].content}` }
      }

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok) throw new Error('request failed')

      const data: ApiResponse = await res.json()
      if ('error' in data) throw new Error(data.error)

      if (data.type === 'ask') {
        setTurns([...nextTurns, { role: 'assistant', kind: 'text', content: data.question }])
      } else if (data.type === 'logged') {
        setTurns([...nextTurns, { role: 'assistant', kind: 'logged', content: data.summary }])
      } else {
        setTurns([
          ...nextTurns,
          {
            role: 'assistant',
            kind: 'recommendation',
            result: {
              recommendation: data.recommendation,
              confidence: data.confidence,
              reasoning: data.reasoning,
              whatWouldChangeThis: data.whatWouldChangeThis,
            },
          },
        ])
      }
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const handleSend = () => {
    if (!draft.trim()) return
    const nextTurns: Turn[] = [...turns, { role: 'user', content: draft }]
    setDraft('')
    send(nextTurns)
  }

  const handleRetry = () => send(turns)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <main className="max-w-[640px] mx-auto px-[var(--space-sm)] py-[var(--space-2xl)]">
      {showPreChatModal && (
        <PreChatContextModal
          initial={preChatContext}
          onSubmit={closePreChatModal}
          onDismiss={dismissPreChatModal}
        />
      )}

      <header className="mb-[var(--space-xl)] flex items-baseline justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-[1.75rem] leading-tight text-[var(--color-text)]">
            Pramana
          </h1>
          <p className="mt-[var(--space-3xs)] text-sm text-[var(--color-text-muted)]">
            Tell it where you are. It will tell you what the evidence supports, and how sure it is.
          </p>
        </div>
        <div className="flex items-baseline gap-[var(--space-sm)]">
          <button
            onClick={() => setShowPreChatModal(true)}
            className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          >
            Edit context
          </button>
          <Link href="/log" className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
            Log session
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-[var(--space-lg)]" aria-live="polite" aria-atomic="false">
        {turns.map((turn, i) => (
          <div
            key={i}
            className="flex flex-col gap-[var(--space-2xs)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
              {turn.role === 'user' ? 'You' : 'Pramana'}
            </p>

            {turn.role === 'user' && (
              <p className="text-base leading-relaxed text-[var(--color-text)] max-w-[65ch]">{turn.content}</p>
            )}

            {turn.role === 'assistant' && turn.kind === 'text' && (
              <p className="text-base leading-relaxed text-[var(--color-text)] max-w-[65ch]">{turn.content}</p>
            )}

            {turn.role === 'assistant' && turn.kind === 'logged' && (
              <p className="text-base leading-relaxed text-[var(--color-text-secondary)] max-w-[65ch]">{turn.content}</p>
            )}

            {turn.role === 'assistant' && turn.kind === 'recommendation' && (
              <div className="flex flex-col gap-[var(--space-md)]">
                <p className="font-[family-name:var(--font-serif)] text-[1.25rem] leading-relaxed text-[var(--color-text)] text-balance">
                  {turn.result.recommendation}
                </p>

                <ConfidenceLine confidence={turn.result.confidence} />

                <section className="flex flex-col gap-[var(--space-2xs)]">
                  <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
                    Reasoning
                  </h2>
                  <p className="text-base leading-relaxed text-[var(--color-text-secondary)] max-w-[65ch]">
                    {turn.result.reasoning}
                  </p>
                </section>

                <section className="flex flex-col gap-[var(--space-2xs)]">
                  <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
                    What would change this
                  </h2>
                  <p className="text-base leading-relaxed text-[var(--color-text-secondary)] max-w-[65ch]">
                    {turn.result.whatWouldChangeThis}
                  </p>
                </section>
              </div>
            )}
          </div>
        ))}

        {status === 'loading' && (
          <div className="flex flex-col gap-[var(--space-2xs)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]">
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">Pramana</p>
            <LoadingIndicator />
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="bg-[var(--color-error-soft)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <p className="text-sm text-[var(--color-error)]">
              We couldn&apos;t reach Pramana&apos;s evidence engine. Check your connection and try again.
            </p>
            <button
              onClick={handleRetry}
              className="mt-[var(--space-2xs)] text-sm font-medium text-[var(--color-error)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-error)]"
            >
              Try again
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-[var(--space-xl)] pt-[var(--space-lg)] border-t border-[var(--color-border)] flex flex-col gap-[var(--space-xs)]">
        <TextArea
          ref={composerRef}
          id="composer"
          label={turns.length === 0 ? 'Your context' : 'Reply'}
          rows={turns.length === 0 ? 4 : 2}
          placeholder={
            turns.length === 0
              ? "e.g. I'm 28, I've been lifting for 3 years, I want to build muscle, and I can train 4 days a week."
              : 'Ask a follow-up, or add more detail...'
          }
          value={draft}
          onChange={setDraft}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center gap-[var(--space-sm)]">
          <button
            onClick={handleSend}
            disabled={status === 'loading' || !draft.trim()}
            className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          >
            {status === 'loading' ? 'Reading the evidence…' : 'Send'}
          </button>
          <p className="text-xs text-[var(--color-text-muted)]">Enter to send, Shift+Enter for a new line</p>
        </div>
      </div>
    </main>
  )
}

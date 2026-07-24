'use client'

import { useEffect, useRef, useState } from 'react'
import { ConfidenceLine } from './components/ConfidenceLine'
import { TextArea } from './components/TextArea'
import { LoadingIndicator } from './components/LoadingIndicator'

type Result = {
  recommendation: string
  confidence: number | null
  reasoning: string
  whatWouldChangeThis: string
}

type Turn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; kind: 'text'; content: string }
  | { role: 'assistant'; kind: 'recommendation'; result: Result }

type ApiResponse = { type: 'ask'; question: string } | ({ type: 'recommendation' } & Result) | { error: string }

function toApiMessage(turn: Turn) {
  if (turn.role === 'user') return { role: 'user' as const, content: turn.content }
  if (turn.kind === 'text') return { role: 'assistant' as const, content: turn.content }
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, status])

  useEffect(() => {
    if (status === 'idle') composerRef.current?.focus({ preventScroll: true })
  }, [status])

  const send = async (nextTurns: Turn[]) => {
    setTurns(nextTurns)
    setStatus('loading')

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextTurns.map(toApiMessage) }),
      })

      if (!res.ok) throw new Error('request failed')

      const data: ApiResponse = await res.json()
      if ('error' in data) throw new Error(data.error)

      if (data.type === 'ask') {
        setTurns([...nextTurns, { role: 'assistant', kind: 'text', content: data.question }])
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
      <header className="mb-[var(--space-xl)]">
        <h1 className="font-[family-name:var(--font-serif)] text-[1.75rem] leading-tight text-[var(--color-text)]">
          Pramana
        </h1>
        <p className="mt-[var(--space-3xs)] text-sm text-[var(--color-text-muted)]">
          Tell it where you are. It will tell you what the evidence supports, and how sure it is.
        </p>
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

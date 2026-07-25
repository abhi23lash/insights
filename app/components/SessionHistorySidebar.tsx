'use client'

import { useEffect, useState } from 'react'

type SessionSummary = {
  id: string
  date: string
  setCount: number
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
  activeSessionId: string | null
  viewingSessionId: string | null
  onSelect: (sessionId: string) => void
  refreshSignal: number
}

export function SessionHistorySidebar({ activeSessionId, viewingSessionId, onSelect, refreshSignal }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')

  useEffect(() => {
    setStatus('loading')
    fetch('/api/sessions')
      .then(res => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data: SessionSummary[]) => {
        setSessions(data)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [refreshSignal])

  return (
    <nav aria-label="Session history" className="flex flex-col gap-[var(--space-sm)]">
      <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">History</h2>

      {status === 'loading' && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
      {status === 'error' && <p className="text-sm text-[var(--color-text-muted)]">Couldn&apos;t load history.</p>}

      {status === 'idle' && sessions.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">No sessions logged yet.</p>
      )}

      {status === 'idle' && sessions.length > 0 && (
        <ul className="flex flex-col gap-[var(--space-3xs)]">
          {sessions.map(session => {
            const isActive = session.id === activeSessionId
            const isSelected = session.id === viewingSessionId || (!viewingSessionId && isActive)
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={`w-full text-left rounded-[6px] px-[var(--space-2xs)] py-[var(--space-2xs)] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ${
                    isSelected ? 'bg-[var(--color-ink-soft)]' : ''
                  }`}
                >
                  <span className="block text-sm text-[var(--color-text)]">
                    {formatDate(session.date)}
                    {isActive && <span className="text-[var(--color-text-muted)]"> · active</span>}
                  </span>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {session.setCount} {session.setCount === 1 ? 'set' : 'sets'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}

'use client'

import { useEffect, useState } from 'react'
import type { WeightUnit } from '../lib/units'

type SessionSet = {
  id: string
  exercise_id: string
  set_type: string
  weight: number
  reps: number
  rpe: number | null
  deviation_flag: string | null
  timestamp: string
  exercises: { name: string } | null
}

type SessionDetail = {
  id: string
  date: string
  sets: SessionSet[]
}

type Props = {
  sessionId: string
  unit: WeightUnit
  onClose: () => void
}

export function SessionHistoryDetail({ sessionId, unit, onClose }: Props) {
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')

  useEffect(() => {
    setStatus('loading')
    setSession(null)
    fetch(`/api/sessions/${sessionId}`)
      .then(res => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data: SessionDetail) => {
        setSession(data)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [sessionId])

  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-serif)] text-[1.25rem] text-[var(--color-text)]">
          {session ? new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Session'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          Back to today
        </button>
      </div>

      {status === 'loading' && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
      {status === 'error' && <p className="text-sm text-[var(--color-error)]">Couldn&apos;t load this session.</p>}

      {status === 'idle' && session && session.sets.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">No sets logged in this session.</p>
      )}

      {status === 'idle' && session && session.sets.length > 0 && (
        <div className="flex flex-col gap-[var(--space-2xs)]">
          {session.sets.map(set => (
            <div key={set.id} className="flex items-baseline justify-between text-sm text-[var(--color-text-secondary)]">
              <span>
                <span className="text-[var(--color-text)]">{set.exercises?.name ?? 'Exercise'}</span> &middot; {set.set_type}{' '}
                &middot; {set.weight} {unit} &times; {set.reps}
                {set.rpe != null && ` @ RPE ${set.rpe}`}
              </span>
              {set.deviation_flag && (
                <span className="text-[var(--color-text-muted)] text-xs">{set.deviation_flag.replace('_', ' ')}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

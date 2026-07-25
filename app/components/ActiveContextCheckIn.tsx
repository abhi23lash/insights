'use client'

import { useState } from 'react'

const MUSCLE_GROUPS = ['Quads', 'Hamstrings', 'Glutes', 'Back', 'Chest', 'Shoulders', 'Arms', 'Calves']
const LEVELS = [0, 1, 2, 3]

type InjuryFlag = {
  id: string
  body_part: string
  severity: number
}

type ActiveContextCheckInProps = {
  sessionId: string
}

export function ActiveContextCheckIn({ sessionId }: ActiveContextCheckInProps) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [soreness, setSoreness] = useState<Record<string, number>>({})
  const [fatigue, setFatigue] = useState<number | null>(null)
  const [injuries, setInjuries] = useState<InjuryFlag[]>([])
  const [injuryBodyPart, setInjuryBodyPart] = useState('')
  const [injurySeverity, setInjurySeverity] = useState(1)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const loadInjuries = () => {
    fetch('/api/injuries?active=true')
      .then(res => res.json())
      .then(setInjuries)
  }

  const handleOpen = () => {
    setOpen(true)
    loadInjuries()
  }

  const handleAddInjury = async () => {
    if (!injuryBodyPart.trim()) return
    const res = await fetch('/api/injuries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyPart: injuryBodyPart, severity: injurySeverity }),
    })
    const data = await res.json()
    setInjuries(prev => [data, ...prev])
    setInjuryBodyPart('')
    setInjurySeverity(1)
  }

  const handleResolveInjury = async (id: string) => {
    await fetch(`/api/injuries/${id}`, { method: 'PATCH' })
    setInjuries(prev => prev.filter(i => i.id !== id))
  }

  const handleSave = async () => {
    setStatus('saving')
    try {
      const reports = Object.entries(soreness).map(([muscleGroup, level]) => ({ muscleGroup, level }))
      if (reports.length > 0) {
        await fetch('/api/soreness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports }),
        })
      }
      if (fatigue != null) {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fatigueSignal: fatigue }),
        })
      }
      setStatus('idle')
      setSaved(true)
      setOpen(false)
    } catch {
      setStatus('error')
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="self-start text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
      >
        {saved ? 'Check-in saved · edit' : 'How are you feeling? (soreness, fatigue, injuries)'}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] p-[var(--space-sm)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]">
      <div className="flex flex-col gap-[var(--space-2xs)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Soreness (0 none &ndash; 3 significant)</p>
        <div className="flex flex-col gap-[var(--space-2xs)]">
          {MUSCLE_GROUPS.map(group => (
            <div key={group} className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text)]">{group}</span>
              <div className="flex gap-[var(--space-3xs)]">
                {LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSoreness(prev => ({ ...prev, [group]: level }))}
                    aria-label={`${group} soreness ${level}`}
                    className={`w-8 h-8 text-sm rounded-[6px] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ${
                      soreness[group] === level
                        ? 'bg-[var(--color-ink)] text-[var(--color-surface)]'
                        : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-2xs)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Fatigue (0 fresh &ndash; 3 wiped out)</p>
        <div className="flex gap-[var(--space-2xs)]">
          {LEVELS.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => setFatigue(level)}
              className={`w-8 h-8 text-sm rounded-[6px] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ${
                fatigue === level
                  ? 'bg-[var(--color-ink)] text-[var(--color-surface)]'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-2xs)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Active injuries</p>
        {injuries.map(injury => (
          <div key={injury.id} className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text)]">
              {injury.body_part} (severity {injury.severity})
            </span>
            <button
              type="button"
              onClick={() => handleResolveInjury(injury.id)}
              className="text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
            >
              Resolved
            </button>
          </div>
        ))}
        <div className="flex items-center gap-[var(--space-2xs)]">
          <input
            type="text"
            value={injuryBodyPart}
            onChange={e => setInjuryBodyPart(e.target.value)}
            placeholder="Body part"
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-2xs)] py-[var(--space-3xs)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          />
          <select
            value={injurySeverity}
            onChange={e => setInjurySeverity(Number(e.target.value))}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-2xs)] py-[var(--space-3xs)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          >
            <option value={1}>Mild</option>
            <option value={2}>Moderate</option>
            <option value={3}>Severe</option>
          </select>
          <button
            type="button"
            onClick={handleAddInjury}
            disabled={!injuryBodyPart.trim()}
            className="text-sm text-[var(--color-ink)] underline underline-offset-2 disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-[var(--space-sm)]">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
          className="bg-[var(--color-ink)] text-[var(--color-surface)] text-sm rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          {status === 'saving' ? 'Saving…' : 'Save check-in'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          Skip
        </button>
        {status === 'error' && <p className="text-sm text-[var(--color-error)]">Couldn&apos;t save. Try again.</p>}
      </div>
    </div>
  )
}

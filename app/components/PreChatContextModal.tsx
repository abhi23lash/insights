'use client'

import { useEffect, useState } from 'react'
import { NumberField } from './NumberField'

export type PreChatContext = {
  age: string
  trainingAge: string
  goal: string
  daysPerWeek: string
}

type PreChatContextModalProps = {
  initial: PreChatContext
  onSubmit: (context: PreChatContext) => void
  onDismiss: () => void
}

export function PreChatContextModal({ initial, onSubmit, onDismiss }: PreChatContextModalProps) {
  const [age, setAge] = useState(initial.age)
  const [trainingAge, setTrainingAge] = useState(initial.trainingAge)
  const [goal, setGoal] = useState(initial.goal)
  const [daysPerWeek, setDaysPerWeek] = useState(initial.daysPerWeek)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onDismiss()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-backdrop)] px-[var(--space-sm)]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prechat-title"
    >
      <div className="w-full max-w-[440px] bg-[var(--color-surface)] rounded-[8px] p-[var(--space-lg)] flex flex-col gap-[var(--space-md)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]">
        <div>
          <h2
            id="prechat-title"
            className="font-[family-name:var(--font-serif)] text-[1.25rem] leading-snug text-[var(--color-text)]"
          >
            A little context, if you&apos;d like
          </h2>
          <p className="mt-[var(--space-3xs)] text-sm text-[var(--color-text-muted)]">
            Entirely optional. Skip it and start typing whenever you&apos;re ready.
          </p>
        </div>

        <div className="flex flex-col gap-[var(--space-sm)]">
          <NumberField id="prechat-age" label="Age" value={age} onChange={setAge} placeholder="e.g. 28" min={0} />
          <NumberField
            id="prechat-trainingAge"
            label="Years training"
            value={trainingAge}
            onChange={setTrainingAge}
            placeholder="e.g. 3"
            min={0}
          />
          <div className="flex flex-col gap-[var(--space-2xs)]">
            <label htmlFor="prechat-goal" className="text-sm text-[var(--color-text-secondary)]">
              Goal
            </label>
            <input
              id="prechat-goal"
              type="text"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. hypertrophy, strength, fat loss"
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 focus:border-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
            />
          </div>
          <NumberField
            id="prechat-days"
            label="Days available per week"
            value={daysPerWeek}
            onChange={setDaysPerWeek}
            placeholder="e.g. 4"
            min={0}
            max={7}
          />
        </div>

        <div className="flex items-center gap-[var(--space-sm)]">
          <button
            onClick={() => onSubmit({ age, trainingAge, goal, daysPerWeek })}
            className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          >
            Start chatting
          </button>
          <button
            onClick={onDismiss}
            className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

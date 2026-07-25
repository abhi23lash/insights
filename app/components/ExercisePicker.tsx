'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Exercise = {
  id: string
  name: string
  aliases: string[]
  movement_pattern: string | null
}

type ExercisePickerProps = {
  exercises: Exercise[]
  value: string
  onChange: (id: string) => void
}

const PATTERN_LABELS: Record<string, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  horizontal_push: 'Horizontal push',
  vertical_push: 'Vertical push',
  horizontal_pull: 'Horizontal pull',
  vertical_pull: 'Vertical pull',
  isolation: 'Isolation',
}

const PATTERN_ORDER = ['squat', 'hinge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'isolation']

export function ExercisePicker({ exercises, value, onChange }: ExercisePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const current = exercises.find(e => e.id === value)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? exercises.filter(e => e.name.toLowerCase().includes(q) || e.aliases.some(a => a.toLowerCase().includes(q)))
      : exercises
  }, [exercises, query])

  const grouped = useMemo(() => {
    const byPattern = new Map<string, Exercise[]>()
    for (const exercise of matches) {
      const pattern = exercise.movement_pattern ?? 'isolation'
      if (!byPattern.has(pattern)) byPattern.set(pattern, [])
      byPattern.get(pattern)!.push(exercise)
    }
    return PATTERN_ORDER.map(pattern => ({ pattern, exercises: byPattern.get(pattern) ?? [] })).filter(
      g => g.exercises.length > 0
    )
  }, [matches])

  const close = () => {
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }

  const select = (id: string) => {
    onChange(id)
    close()
  }

  // Click-outside and Escape both dismiss the panel, matching the expected
  // behavior for an inline expandable search/select.
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matches.length === 1) {
      e.preventDefault()
      select(matches[0].id)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-[var(--space-2xs)]">
        <label className="text-sm text-[var(--color-text-secondary)]">Exercise</label>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={false}
          className="w-full text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] text-base text-[var(--color-text)] transition-colors duration-150 hover:border-[var(--color-border-strong)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          {current?.name ?? 'Select an exercise'}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-[var(--space-sm)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div className="flex items-center gap-[var(--space-sm)]">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search exercises..."
          aria-label="Search exercises"
          aria-expanded="true"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 focus:border-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        />
        <button
          type="button"
          onClick={close}
          className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-[var(--space-sm)] max-h-[320px] overflow-y-auto" role="listbox">
        {grouped.map(({ pattern, exercises: group }) => (
          <div key={pattern} className="flex flex-col gap-[var(--space-2xs)]">
            <p className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
              {PATTERN_LABELS[pattern] ?? pattern}
            </p>
            <div className="flex flex-wrap gap-[var(--space-2xs)]">
              {group.map(exercise => (
                <button
                  key={exercise.id}
                  type="button"
                  role="option"
                  aria-selected={exercise.id === value}
                  onClick={() => select(exercise.id)}
                  className={`text-sm rounded-[6px] px-[var(--space-sm)] py-[var(--space-2xs)] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ${
                    exercise.id === value
                      ? 'bg-[var(--color-ink)] text-[var(--color-surface)]'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  {exercise.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No exercises match &ldquo;{query}&rdquo;.</p>}
      </div>
    </div>
  )
}

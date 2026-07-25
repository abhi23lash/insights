'use client'

import { useEffect, useState } from 'react'

type RestTimerProps = {
  durationSeconds: number
  resetKey: number
}

export function RestTimer({ durationSeconds, resetKey }: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds)

  useEffect(() => {
    setRemaining(durationSeconds)
    // resetKey forces a restart even when durationSeconds is unchanged
    // (e.g. two consecutive working sets both resting 150s).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds, resetKey])

  useEffect(() => {
    if (remaining <= 0) return
    const timeout = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(timeout)
  }, [remaining])

  if (remaining <= 0) return null

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div className="flex items-center justify-between bg-[var(--color-ink-soft)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]">
      <p className="text-sm text-[var(--color-ink)] tabular-nums">
        Rest &middot; {minutes}:{String(seconds).padStart(2, '0')}
      </p>
      <button
        type="button"
        onClick={() => setRemaining(0)}
        className="text-xs text-[var(--color-ink)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
      >
        Skip
      </button>
    </div>
  )
}

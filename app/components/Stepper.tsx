import { forwardRef } from 'react'

type StepperProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  step: number
  min?: number
  placeholder?: string
}

export const Stepper = forwardRef<HTMLInputElement, StepperProps>(function Stepper(
  { id, label, value, onChange, onKeyDown, step, min = 0, placeholder },
  ref
) {
  const adjust = (delta: number) => {
    const current = Number(value) || 0
    const next = Math.max(min, current + delta)
    onChange(String(next))
  }

  return (
    <div className="flex flex-col gap-[var(--space-2xs)]">
      <label htmlFor={id} className="text-sm text-[var(--color-text-secondary)]">
        {label}
      </label>
      <div className="flex items-stretch gap-[var(--space-3xs)]">
        <button
          type="button"
          onClick={() => adjust(-step)}
          aria-label={`Decrease ${label} by ${step}`}
          className="w-11 shrink-0 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-border-strong)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          &minus;
        </button>
        <input
          ref={ref}
          id={id}
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          min={min}
          className="w-full text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-2xs)] py-[var(--space-xs)] text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 focus:border-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        />
        <button
          type="button"
          onClick={() => adjust(step)}
          aria-label={`Increase ${label} by ${step}`}
          className="w-11 shrink-0 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-border-strong)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          +
        </button>
      </div>
    </div>
  )
})

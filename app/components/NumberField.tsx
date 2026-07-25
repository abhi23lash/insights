import { forwardRef } from 'react'

type NumberFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  min?: number
  max?: number
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { id, label, value, onChange, onKeyDown, placeholder, min, max },
  ref
) {
  return (
    <div className="flex flex-col gap-[var(--space-2xs)]">
      <label htmlFor={id} className="text-sm text-[var(--color-text-secondary)]">
        {label}
      </label>
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
        max={max}
        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 focus:border-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
      />
    </div>
  )
})

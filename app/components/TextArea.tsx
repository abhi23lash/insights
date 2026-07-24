import { forwardRef } from 'react'

type TextAreaProps = {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  error?: string
  rows?: number
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { id, label, placeholder, value, onChange, onKeyDown, error, rows = 5 },
  ref
) {
  return (
    <div className="flex flex-col gap-[var(--space-2xs)]">
      <label htmlFor={id} className="text-sm text-[var(--color-text-secondary)]">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full bg-[var(--color-surface)] border rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] resize-y ${
          error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
})

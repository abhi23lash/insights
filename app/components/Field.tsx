type FieldProps = {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: 'text' | 'number'
  inputMode?: 'text' | 'numeric'
}

export function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-[var(--space-2xs)]">
      <label htmlFor={id} className="text-sm text-[var(--color-text-secondary)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full bg-[var(--color-surface)] border rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)] text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 focus:border-[var(--color-ink)] ${
          error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
}

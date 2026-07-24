'use client'

import { useRef, useState } from 'react'
import { Field } from './components/Field'
import { ConfidenceLine } from './components/ConfidenceLine'

type FormState = {
  age: string
  trainingAge: string
  goal: string
  daysPerWeek: string
}

type Result = {
  recommendation: string
  confidence: number
  reasoning: string
  whatWouldChangeThis: string
}

type Errors = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = { age: '', trainingAge: '', goal: '', daysPerWeek: '' }

function validate(form: FormState): Errors {
  const errors: Errors = {}

  if (!form.age.trim()) errors.age = 'Please enter your age.'
  else if (!(Number(form.age) > 0)) errors.age = 'Age needs to be a positive number.'

  if (!form.trainingAge.trim()) errors.trainingAge = 'Please enter how many years you have trained.'
  else if (!(Number(form.trainingAge) >= 0)) errors.trainingAge = 'Years training needs to be a positive number.'

  if (!form.goal.trim()) errors.goal = 'Please enter a training goal.'

  if (!form.daysPerWeek.trim()) errors.daysPerWeek = 'Please enter how many days you can train.'
  else if (!(Number(form.daysPerWeek) > 0)) errors.daysPerWeek = 'Days per week needs to be a positive number.'

  return errors
}

export default function Home() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [result, setResult] = useState<Result | null>(null)
  const firstErrorRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async () => {
    const nextErrors = validate(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => firstErrorRef.current?.focus())
      return
    }

    setStatus('loading')
    setResult(null)

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) throw new Error('request failed')

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setResult(data)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="max-w-[640px] mx-auto px-[var(--space-sm)] py-[var(--space-2xl)]">
      <header className="mb-[var(--space-xl)]">
        <h1 className="font-[family-name:var(--font-serif)] text-[1.75rem] leading-tight text-[var(--color-text)]">
          Pramana
        </h1>
        <p className="mt-[var(--space-3xs)] text-sm text-[var(--color-text-muted)]">
          Tell it where you are. It will tell you what the evidence supports, and how sure it is.
        </p>
      </header>

      <div className="flex flex-col gap-[var(--space-md)]">
        <Field
          id="age"
          label="Age"
          placeholder="e.g. 28"
          type="number"
          inputMode="numeric"
          value={form.age}
          onChange={v => setForm({ ...form, age: v })}
          error={errors.age}
        />
        <Field
          id="trainingAge"
          label="Years training"
          placeholder="e.g. 3"
          type="number"
          inputMode="numeric"
          value={form.trainingAge}
          onChange={v => setForm({ ...form, trainingAge: v })}
          error={errors.trainingAge}
        />
        <Field
          id="goal"
          label="Primary goal"
          placeholder="e.g. hypertrophy, strength, fat loss"
          value={form.goal}
          onChange={v => setForm({ ...form, goal: v })}
          error={errors.goal}
        />
        <Field
          id="daysPerWeek"
          label="Days available per week"
          placeholder="e.g. 4"
          type="number"
          inputMode="numeric"
          value={form.daysPerWeek}
          onChange={v => setForm({ ...form, daysPerWeek: v })}
          error={errors.daysPerWeek}
        />

        <div className="mt-[var(--space-2xs)]">
          <button
            onClick={handleSubmit}
            disabled={status === 'loading'}
            className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-60"
          >
            {status === 'loading' ? 'Reading the evidence…' : 'Get my recommendation'}
          </button>
        </div>

        {status === 'error' && (
          <div
            role="alert"
            tabIndex={-1}
            ref={firstErrorRef}
            className="bg-[var(--color-error-soft)] rounded-[6px] px-[var(--space-sm)] py-[var(--space-xs)]"
          >
            <p className="text-sm text-[var(--color-error)]">
              We couldn&apos;t reach Pramana&apos;s evidence engine. Check your connection and try again.
            </p>
            <button
              onClick={handleSubmit}
              className="mt-[var(--space-2xs)] text-sm font-medium text-[var(--color-error)] underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-[var(--space-2xl)] pt-[var(--space-lg)] border-t border-[var(--color-border)] flex flex-col gap-[var(--space-lg)]">
          <p className="font-[family-name:var(--font-serif)] text-[1.25rem] leading-relaxed text-[var(--color-text)] text-balance">
            {result.recommendation}
          </p>

          <ConfidenceLine confidence={result.confidence} />

          <section className="flex flex-col gap-[var(--space-2xs)]">
            <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
              Reasoning
            </h2>
            <p className="text-base leading-relaxed text-[var(--color-text-secondary)] max-w-[65ch]">
              {result.reasoning}
            </p>
          </section>

          <section className="flex flex-col gap-[var(--space-2xs)]">
            <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
              What would change this
            </h2>
            <p className="text-base leading-relaxed text-[var(--color-text-secondary)] max-w-[65ch]">
              {result.whatWouldChangeThis}
            </p>
          </section>
        </div>
      )}
    </main>
  )
}

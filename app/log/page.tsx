'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { NumberField } from '../components/NumberField'
import { Stepper } from '../components/Stepper'
import { RestTimer } from '../components/RestTimer'
import { ExercisePicker } from '../components/ExercisePicker'
import { ActiveContextCheckIn } from '../components/ActiveContextCheckIn'
import { SessionCloseout } from '../components/SessionCloseout'
import { useWeightUnit } from '../hooks/useWeightUnit'

type PrHit = {
  exerciseName: string
  reps: number
  weight: number
  previousBest: number | null
  isNewE1rmPr: boolean
  estimatedE1rm: number | null
}

type DeloadReasoning = {
  text: string
  citedClaim: string
  grade: string
  eqs: number | null
}

type WorkingLoadChange = {
  exerciseName: string
  outcome: 'success' | 'failure'
  isInitial: boolean
  currentWorkingWeight: number
  consecutiveSuccesses: number
  consecutiveFailures: number
  deloadSuggested: boolean
  reasoning: DeloadReasoning | null
}

type CloseoutData = {
  prsHit: PrHit[]
  workingLoadChanges: WorkingLoadChange[]
}

type Exercise = {
  id: string
  name: string
  aliases: string[]
  movement_pattern: string | null
  resistance_profile: string
}

type SetType = 'working' | 'warmup' | 'backoff' | 'failure'
type DeviationFlag = 'deliberate' | 'hard_set' | 'other'

type SetPayload = {
  exerciseId: string
  setIndex: number
  setType: SetType
  weight: number
  reps: number
  rpe?: number
  prescribedWeight?: number
  prescribedReps?: number
  deviationFlag?: DeviationFlag
  isLastSet?: boolean
}

type LoggedSet = SetPayload & { id: string; exerciseName: string; timestamp: string }

type SetResponse =
  | { type: 'needs_rpe'; message: string }
  | { type: 'needs_deviation_flag'; message: string }
  | { type: 'logged'; set: { id: string; timestamp: string } }
  | { error: string }

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'backoff', label: 'Backoff' },
  { value: 'failure', label: 'Failure' },
]

const REST_SECONDS: Record<SetType, number> = {
  working: 150,
  failure: 150,
  backoff: 90,
  warmup: 60,
}

export default function LogSession() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [setType, setSetType] = useState<SetType>('working')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [prescribedWeight, setPrescribedWeight] = useState('')
  const [prescribedReps, setPrescribedReps] = useState('')
  const [isLastSet, setIsLastSet] = useState(false)

  const [pendingPrompt, setPendingPrompt] = useState<'rpe' | 'deviation' | null>(null)
  const [pendingPayload, setPendingPayload] = useState<SetPayload | null>(null)
  const [rpeInput, setRpeInput] = useState('')
  const [restDuration, setRestDuration] = useState<number | null>(null)
  const [restKey, setRestKey] = useState(0)
  const [closeoutData, setCloseoutData] = useState<CloseoutData | null>(null)
  const [closingSession, setClosingSession] = useState(false)

  const weightRef = useRef<HTMLInputElement>(null)
  const { unit, step } = useWeightUnit()

  useEffect(() => {
    fetch('/api/exercises')
      .then(res => res.json())
      .then((data: Exercise[]) => {
        setExercises(data)
        if (data.length > 0) setSelectedExerciseId(data[0].id)
      })
  }, [])

  const startSession = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setSessionId(data.id)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const resetForm = () => {
    setWeight('')
    setReps('')
    setIsLastSet(false)
    setPendingPrompt(null)
    setPendingPayload(null)
    setRpeInput('')
  }

  const submitSet = async (payload: SetPayload) => {
    if (!sessionId) return
    setStatus('loading')

    try {
      const res = await fetch(`/api/sessions/${sessionId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('request failed')

      const data: SetResponse = await res.json()
      if ('error' in data) throw new Error(data.error)

      if (data.type === 'needs_rpe') {
        setPendingPrompt('rpe')
        setPendingPayload(payload)
        setStatus('idle')
        return
      }

      if (data.type === 'needs_deviation_flag') {
        setPendingPrompt('deviation')
        setPendingPayload(payload)
        setStatus('idle')
        return
      }

      const exerciseName = exercises.find(e => e.id === payload.exerciseId)?.name ?? 'Exercise'
      setLoggedSets(prev => [...prev, { ...payload, id: data.set.id, exerciseName, timestamp: data.set.timestamp }])
      resetForm()
      setStatus('idle')
      setRestDuration(REST_SECONDS[payload.setType])
      setRestKey(k => k + 1)
      weightRef.current?.focus()
    } catch {
      setStatus('error')
    }
  }

  const handleLogSet = () => {
    if (!selectedExerciseId || !weight.trim() || !reps.trim() || status === 'loading') return

    const setIndex = loggedSets.filter(s => s.exerciseId === selectedExerciseId).length

    const payload: SetPayload = {
      exerciseId: selectedExerciseId,
      setIndex,
      setType,
      weight: Number(weight),
      reps: Number(reps),
      isLastSet,
      ...(prescribedWeight.trim() ? { prescribedWeight: Number(prescribedWeight) } : {}),
      ...(prescribedReps.trim() ? { prescribedReps: Number(prescribedReps) } : {}),
    }

    submitSet(payload)
  }

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLogSet()
    }
  }

  const handleRpeSubmit = () => {
    if (!pendingPayload || !rpeInput.trim()) return
    submitSet({ ...pendingPayload, rpe: Number(rpeInput) })
  }

  const handleRpeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRpeSubmit()
    }
  }

  const handleDeviationSelect = (flag: DeviationFlag) => {
    if (!pendingPayload) return
    submitSet({ ...pendingPayload, deviationFlag: flag })
  }

  const handleFinishSession = async () => {
    if (!sessionId) return
    setClosingSession(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/close`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      const data: CloseoutData = await res.json()
      setCloseoutData(data)
    } catch {
      setStatus('error')
    } finally {
      setClosingSession(false)
    }
  }

  const handleStartNewSession = () => {
    setSessionId(null)
    setLoggedSets([])
    setCloseoutData(null)
    setRestDuration(null)
    resetForm()
  }

  const lastSetForExercise = [...loggedSets].reverse().find(s => s.exerciseId === selectedExerciseId)

  const handleRepeatLastSet = () => {
    if (!lastSetForExercise || status === 'loading') return

    const setIndex = loggedSets.filter(s => s.exerciseId === selectedExerciseId).length

    submitSet({
      exerciseId: selectedExerciseId,
      setIndex,
      setType: lastSetForExercise.setType,
      weight: lastSetForExercise.weight,
      reps: lastSetForExercise.reps,
      isLastSet: false,
      ...(lastSetForExercise.prescribedWeight != null ? { prescribedWeight: lastSetForExercise.prescribedWeight } : {}),
      ...(lastSetForExercise.prescribedReps != null ? { prescribedReps: lastSetForExercise.prescribedReps } : {}),
    })
  }

  return (
    <main className="max-w-[640px] mx-auto px-[var(--space-sm)] py-[var(--space-2xl)]">
      <header className="mb-[var(--space-xl)] flex items-baseline justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-[1.75rem] leading-tight text-[var(--color-text)]">
            Log session
          </h1>
          <p className="mt-[var(--space-3xs)] text-sm text-[var(--color-text-muted)]">
            Pick an exercise, log sets as you go.
          </p>
        </div>
        <div className="flex items-baseline gap-[var(--space-sm)]">
          <Link href="/settings" className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
            Settings
          </Link>
          <Link href="/" className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
            Back to chat
          </Link>
        </div>
      </header>

      {!sessionId ? (
        <button
          onClick={startSession}
          disabled={status === 'loading'}
          className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          Start session
        </button>
      ) : closeoutData ? (
        <SessionCloseout
          setCount={loggedSets.length}
          exerciseCount={new Set(loggedSets.map(s => s.exerciseId)).size}
          unit={unit}
          prsHit={closeoutData.prsHit}
          workingLoadChanges={closeoutData.workingLoadChanges}
          onStartNew={handleStartNewSession}
        />
      ) : (
        <div className="flex flex-col gap-[var(--space-lg)]">
          <div className="flex flex-col gap-[var(--space-sm)]">
            <ActiveContextCheckIn sessionId={sessionId} />
            {loggedSets.length > 0 && (
              <button
                type="button"
                onClick={handleFinishSession}
                disabled={closingSession}
                className="self-start text-sm text-[var(--color-ink)] underline underline-offset-2 disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                {closingSession ? 'Finishing…' : 'Finish session'}
              </button>
            )}
          </div>

          {loggedSets.length > 0 && (
            <div className="flex flex-col gap-[var(--space-2xs)]" aria-live="polite" aria-atomic="false">
              {loggedSets.map(set => (
                <div
                  key={set.id}
                  className="flex items-baseline justify-between text-sm text-[var(--color-text-secondary)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]"
                >
                  <span>
                    <span className="text-[var(--color-text)]">{set.exerciseName}</span> &middot; {set.setType} &middot;{' '}
                    {set.weight} {unit} &times; {set.reps}
                    {set.rpe != null && ` @ RPE ${set.rpe}`}
                  </span>
                  {set.deviationFlag && (
                    <span className="text-[var(--color-text-muted)] text-xs">{set.deviationFlag.replace('_', ' ')}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {restDuration != null && <RestTimer durationSeconds={restDuration} resetKey={restKey} />}

          <div className="flex flex-col gap-[var(--space-sm)] pt-[var(--space-lg)] border-t border-[var(--color-border)]">
            <ExercisePicker exercises={exercises} value={selectedExerciseId} onChange={setSelectedExerciseId} />

            {lastSetForExercise && !pendingPrompt && (
              <button
                type="button"
                onClick={handleRepeatLastSet}
                disabled={status === 'loading'}
                className="self-start text-sm rounded-[6px] px-[var(--space-sm)] py-[var(--space-2xs)] bg-[var(--color-ink-soft)] text-[var(--color-ink)] transition-colors duration-150 hover:opacity-80 disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                Repeat last: {lastSetForExercise.weight} {unit} &times; {lastSetForExercise.reps}
              </button>
            )}

            <div className="flex gap-[var(--space-2xs)]">
              {SET_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSetType(t.value)}
                  aria-pressed={setType === t.value}
                  className={`text-sm rounded-[6px] px-[var(--space-sm)] py-[var(--space-2xs)] transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ${
                    setType === t.value
                      ? 'bg-[var(--color-ink)] text-[var(--color-surface)]'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-[var(--space-sm)]">
              <Stepper
                ref={weightRef}
                id="weight"
                label={`Weight (${unit})`}
                value={weight}
                onChange={setWeight}
                onKeyDown={handleFieldKeyDown}
                placeholder="e.g. 185"
                step={step}
              />
              <Stepper
                id="reps"
                label="Reps"
                value={reps}
                onChange={setReps}
                onKeyDown={handleFieldKeyDown}
                placeholder="e.g. 5"
                step={1}
              />
              <NumberField
                id="prescribedWeight"
                label={`Prescribed weight (${unit}, optional)`}
                value={prescribedWeight}
                onChange={setPrescribedWeight}
                onKeyDown={handleFieldKeyDown}
                min={0}
              />
              <NumberField
                id="prescribedReps"
                label="Prescribed reps (optional)"
                value={prescribedReps}
                onChange={setPrescribedReps}
                onKeyDown={handleFieldKeyDown}
                min={0}
              />
            </div>

            <label className="flex items-center gap-[var(--space-2xs)] text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={isLastSet}
                onChange={e => setIsLastSet(e.target.checked)}
                className="accent-[var(--color-ink)]"
              />
              Last set for this exercise
            </label>

            {pendingPrompt === 'rpe' && (
              <div className="flex flex-col gap-[var(--space-2xs)] pt-[var(--space-2xs)] border-t border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text)]">RPE is required on the last set of an exercise.</p>
                <div className="flex items-end gap-[var(--space-sm)]">
                  <NumberField
                    id="rpe"
                    label="RPE"
                    value={rpeInput}
                    onChange={setRpeInput}
                    onKeyDown={handleRpeKeyDown}
                    placeholder="1-10"
                    min={1}
                    max={10}
                  />
                  <button
                    onClick={handleRpeSubmit}
                    disabled={status === 'loading' || !rpeInput.trim()}
                    className="bg-[var(--color-ink)] text-[var(--color-surface)] text-sm rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
                  >
                    {status === 'loading' ? 'Logging…' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {pendingPrompt === 'deviation' && (
              <div className="flex flex-col gap-[var(--space-2xs)] pt-[var(--space-2xs)] border-t border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text)]">
                  This set fell more than 5% below prescribed. Was it deliberate, a hard set, or something else?
                </p>
                <div className="flex gap-[var(--space-2xs)]">
                  <button
                    onClick={() => handleDeviationSelect('deliberate')}
                    disabled={status === 'loading'}
                    className="flex-1 min-h-11 text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-border-strong)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
                  >
                    Deliberate
                  </button>
                  <button
                    onClick={() => handleDeviationSelect('hard_set')}
                    disabled={status === 'loading'}
                    className="flex-1 min-h-11 text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-border-strong)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
                  >
                    Hard set
                  </button>
                  <button
                    onClick={() => handleDeviationSelect('other')}
                    disabled={status === 'loading'}
                    className="flex-1 min-h-11 text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-border-strong)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
                  >
                    Other
                  </button>
                </div>
              </div>
            )}

            {!pendingPrompt && (
              <div>
                <button
                  onClick={handleLogSet}
                  disabled={status === 'loading' || !selectedExerciseId || !weight.trim() || !reps.trim()}
                  className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
                >
                  {status === 'loading' ? 'Logging…' : 'Log set'}
                </button>
              </div>
            )}

            {status === 'error' && (
              <p role="alert" className="text-sm text-[var(--color-error)]">
                Couldn&apos;t log that set. Check your connection and try again.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

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

type SessionCloseoutProps = {
  setCount: number
  exerciseCount: number
  unit: string
  prsHit: PrHit[]
  workingLoadChanges: WorkingLoadChange[]
  onStartNew: () => void
}

export function SessionCloseout({
  setCount,
  exerciseCount,
  unit,
  prsHit,
  workingLoadChanges,
  onStartNew,
}: SessionCloseoutProps) {
  return (
    <div className="flex flex-col gap-[var(--space-lg)] motion-safe:animate-[turn-in_220ms_cubic-bezier(0.22,1,0.36,1)]">
      <p className="font-[family-name:var(--font-serif)] text-[1.25rem] leading-relaxed text-[var(--color-text)]">
        {setCount} sets across {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}.
      </p>

      <section className="flex flex-col gap-[var(--space-2xs)]">
        <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">PRs</h2>
        {prsHit.length === 0 ? (
          <p className="text-base text-[var(--color-text-secondary)]">No PRs this session.</p>
        ) : (
          <div className="flex flex-col gap-[var(--space-2xs)]">
            {prsHit.map((pr, i) => (
              <p key={i} className="text-base text-[var(--color-text)]">
                <span className="font-medium text-[var(--color-ink)]">{pr.exerciseName}</span> &middot; {pr.weight}{' '}
                {unit} &times; {pr.reps}
                {pr.previousBest != null && (
                  <span className="text-[var(--color-text-muted)]"> (previous best {pr.previousBest} {unit})</span>
                )}
                {pr.isNewE1rmPr && <span className="text-[var(--color-text-muted)]"> &middot; new estimated 1RM</span>}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-[var(--space-md)]">
        <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
          Working load changes
        </h2>
        {workingLoadChanges.length === 0 ? (
          <p className="text-base text-[var(--color-text-secondary)]">
            No exercise this session had a prescribed target to compare against, so no working-load state changed.
          </p>
        ) : (
          workingLoadChanges.map((change, i) => (
            <div key={i} className="flex flex-col gap-[var(--space-2xs)]">
              <p className="text-base text-[var(--color-text)]">
                <span className="font-medium">{change.exerciseName}</span>
                {change.isInitial
                  ? `: recorded a starting working weight of ${change.currentWorkingWeight} ${unit}.`
                  : change.outcome === 'success'
                    ? `: clean session, ${change.consecutiveSuccesses} in a row.`
                    : `: a hard session, ${change.consecutiveFailures} difficult session${change.consecutiveFailures === 1 ? '' : 's'} in a row.`}
              </p>

              {change.reasoning && (
                <div className="flex flex-col gap-[var(--space-3xs)] pl-[var(--space-sm)]">
                  <p className="text-sm text-[var(--color-text-secondary)]">{change.reasoning.text}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {change.reasoning.grade === 'not_applicable' ? 'Practitioner consensus' : `GRADE ${change.reasoning.grade}`}
                    {change.reasoning.eqs != null && `, EQS ${change.reasoning.eqs}`}: &ldquo;{change.reasoning.citedClaim}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <div>
        <button
          type="button"
          onClick={onStartNew}
          className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
        >
          Start new session
        </button>
      </div>
    </div>
  )
}

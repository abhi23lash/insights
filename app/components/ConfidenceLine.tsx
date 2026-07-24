function bandFor(confidence: number) {
  if (confidence >= 80) return { label: 'high', low: false }
  if (confidence >= 55) return { label: 'moderate', low: false }
  if (confidence >= 30) return { label: 'low', low: true }
  return { label: 'very low', low: true }
}

export function ConfidenceLine({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return (
      <p className="text-base text-[var(--color-text-secondary)]">
        Confidence: <span className="text-[var(--color-text-muted)]">not applicable</span>, since this isn&apos;t GRADE/EQS-scored outcome research and there&apos;s no percentage to give.
      </p>
    )
  }

  const band = bandFor(confidence)

  return (
    <div className="flex flex-col gap-[var(--space-2xs)]">
      <p className="text-base text-[var(--color-text-secondary)]">
        Confidence: <span className="font-medium text-[var(--color-ink)] tabular-nums">{confidence}%</span> ({band.label})
      </p>
      {band.low && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Treat this as a starting point, not a final answer. The evidence behind it is thinner than usual.
        </p>
      )}
    </div>
  )
}

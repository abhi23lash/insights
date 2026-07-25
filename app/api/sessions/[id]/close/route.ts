import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

// e1RM only applies where the logged number is genuinely an external load --
// bodyweight/bodyweight_plus/assisted/time/distance don't support the formula.
const E1RM_LOADING_TYPES = new Set(['external_weight'])

function estimateE1rm(weight: number, reps: number) {
  return weight * (1 + reps / 30)
}

type SessionSet = {
  id: string
  exercise_id: string
  set_type: 'working' | 'warmup' | 'backoff' | 'failure'
  weight: number
  reps: number
  rpe: number | null
  prescribed_weight: number | null
  prescribed_reps: number | null
  deviation_flag: 'deliberate' | 'hard_set' | 'other' | null
  exercises: { id: string; name: string; loading_type: string | null }
}

type PrHit = {
  exerciseName: string
  reps: number
  weight: number
  previousBest: number | null
  isNewE1rmPr: boolean
  estimatedE1rm: number | null
}

type WorkingLoadChange = {
  exerciseName: string
  outcome: 'success' | 'failure'
  isInitial: boolean
  currentWorkingWeight: number
  consecutiveSuccesses: number
  consecutiveFailures: number
  deloadSuggested: boolean
}

async function detectPrs(sessionId: string, athleteId: string, sets: SessionSet[]): Promise<PrHit[]> {
  const workingSets = sets.filter(s => s.set_type === 'working' || s.set_type === 'failure')

  // Best (highest weight) set per (exercise, reps) actually logged this session.
  const bestPerExerciseReps = new Map<string, SessionSet>()
  for (const set of workingSets) {
    const key = `${set.exercise_id}:${set.reps}`
    const existing = bestPerExerciseReps.get(key)
    if (!existing || set.weight > existing.weight) bestPerExerciseReps.set(key, set)
  }

  const prsHit: PrHit[] = []

  for (const set of bestPerExerciseReps.values()) {
    const { data: currentBestForReps } = await supabaseServer
      .from('rep_max_prs')
      .select('weight')
      .eq('athlete_id', athleteId)
      .eq('exercise_id', set.exercise_id)
      .eq('reps', set.reps)
      .order('achieved_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (currentBestForReps && set.weight <= currentBestForReps.weight) continue

    // e1RM PR comparison must happen against history BEFORE inserting this
    // set's own PR row, or it would compare against itself.
    const eligibleForE1rm = E1RM_LOADING_TYPES.has(set.exercises.loading_type ?? '')
    let estimatedE1rm: number | null = null
    let isNewE1rmPr = false

    if (eligibleForE1rm) {
      estimatedE1rm = estimateE1rm(set.weight, set.reps)
      const { data: historicalPrs } = await supabaseServer
        .from('rep_max_prs')
        .select('weight, reps')
        .eq('athlete_id', athleteId)
        .eq('exercise_id', set.exercise_id)
      const bestHistoricalE1rm = (historicalPrs ?? []).reduce(
        (max, p) => Math.max(max, estimateE1rm(p.weight, p.reps)),
        0
      )
      isNewE1rmPr = estimatedE1rm > bestHistoricalE1rm
    }

    const { error: insertError } = await supabaseServer.from('rep_max_prs').insert({
      athlete_id: athleteId,
      exercise_id: set.exercise_id,
      reps: set.reps,
      weight: set.weight,
      rpe: set.rpe,
      source_set_id: set.id,
    })

    if (insertError) {
      console.error('Failed to record PR:', insertError.message)
      continue
    }

    prsHit.push({
      exerciseName: set.exercises.name,
      reps: set.reps,
      weight: set.weight,
      previousBest: currentBestForReps?.weight ?? null,
      isNewE1rmPr,
      estimatedE1rm,
    })
  }

  return prsHit
}

// Outcome per exercise, per the decided counter semantics: only sets with a
// prescribed target can carry a signal at all (nothing to compare against
// otherwise). A hard_set failure on any set outweighs successes elsewhere in
// the same session; deliberate/other deviations are neutral and don't move
// either counter. If nothing in the session carries a real signal, the
// exercise is skipped entirely -- no working_loads row, no state change.
function exerciseOutcome(sets: SessionSet[]): 'success' | 'failure' | null {
  const withPrescription = sets.filter(s => s.prescribed_weight != null && s.prescribed_reps != null)
  if (withPrescription.length === 0) return null

  if (withPrescription.some(s => s.deviation_flag === 'hard_set')) return 'failure'
  if (withPrescription.some(s => s.deviation_flag == null)) return 'success'
  return null // every signal-bearing set was deliberate/other -- neutral
}

async function updateWorkingLoads(
  athleteId: string,
  sets: SessionSet[]
): Promise<WorkingLoadChange[]> {
  const workingSets = sets.filter(s => s.set_type === 'working' || s.set_type === 'failure')
  const byExercise = new Map<string, SessionSet[]>()
  for (const set of workingSets) {
    if (!byExercise.has(set.exercise_id)) byExercise.set(set.exercise_id, [])
    byExercise.get(set.exercise_id)!.push(set)
  }

  const changes: WorkingLoadChange[] = []

  for (const [exerciseId, exerciseSets] of byExercise) {
    const outcome = exerciseOutcome(exerciseSets)
    if (!outcome) continue

    const { data: previous } = await supabaseServer
      .from('working_loads')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const exerciseName = exerciseSets[0].exercises.name
    let row: Record<string, unknown>

    if (!previous) {
      // No baseline yet -- use the heaviest working set logged this session
      // as the starting working weight, since there's no prescription system
      // to seed it from.
      const heaviest = exerciseSets.reduce((max, s) => (s.weight > max.weight ? s : max), exerciseSets[0])
      row = {
        athlete_id: athleteId,
        exercise_id: exerciseId,
        target_rep_range: String(heaviest.reps),
        current_working_weight: heaviest.weight,
        consecutive_successes: outcome === 'success' ? 1 : 0,
        consecutive_failures: outcome === 'failure' ? 1 : 0,
        last_deload_date: null,
        change_reason: 'initial',
      }
    } else {
      // Progression and deload amounts are deferred to the recommendation
      // system -- current_working_weight is carried forward unchanged here.
      // Only the counters move.
      row = {
        athlete_id: athleteId,
        exercise_id: exerciseId,
        target_rep_range: previous.target_rep_range,
        current_working_weight: previous.current_working_weight,
        consecutive_successes: outcome === 'success' ? previous.consecutive_successes + 1 : 0,
        consecutive_failures: outcome === 'failure' ? previous.consecutive_failures + 1 : 0,
        last_deload_date: previous.last_deload_date,
        change_reason: 'counter_update',
      }
    }

    const { error: insertError } = await supabaseServer.from('working_loads').insert(row)
    if (insertError) {
      console.error('Failed to update working load:', insertError.message)
      continue
    }

    changes.push({
      exerciseName,
      outcome,
      isInitial: !previous,
      currentWorkingWeight: row.current_working_weight as number,
      consecutiveSuccesses: row.consecutive_successes as number,
      consecutiveFailures: row.consecutive_failures as number,
      deloadSuggested: (row.consecutive_failures as number) >= 3,
    })
  }

  return changes
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params
  const athleteId = getCurrentAthleteId()

  const { data: sets, error: setsError } = await supabaseServer
    .from('session_log')
    .select('id, exercise_id, set_type, weight, reps, rpe, prescribed_weight, prescribed_reps, deviation_flag, exercises(id, name, loading_type)')
    .eq('session_id', sessionId)

  if (setsError) {
    console.error('Failed to fetch session sets:', setsError.message)
    return NextResponse.json({ error: 'Failed to fetch session sets' }, { status: 500 })
  }

  const typedSets = (sets ?? []) as unknown as SessionSet[]

  const prsHit = await detectPrs(sessionId, athleteId, typedSets)
  const workingLoadChanges = await updateWorkingLoads(athleteId, typedSets)

  return NextResponse.json({ prsHit, workingLoadChanges })
}

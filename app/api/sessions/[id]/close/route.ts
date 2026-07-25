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
  weight: number
  reps: number
  rpe: number | null
  exercises: { id: string; name: string; loading_type: string | null }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params
  const athleteId = getCurrentAthleteId()

  const { data: sets, error: setsError } = await supabaseServer
    .from('session_log')
    .select('id, exercise_id, weight, reps, rpe, exercises(id, name, loading_type)')
    .eq('session_id', sessionId)
    .in('set_type', ['working', 'failure'])

  if (setsError) {
    console.error('Failed to fetch session sets:', setsError.message)
    return NextResponse.json({ error: 'Failed to fetch session sets' }, { status: 500 })
  }

  const typedSets = (sets ?? []) as unknown as SessionSet[]

  // Best (highest weight) set per (exercise, reps) actually logged this session.
  const bestPerExerciseReps = new Map<string, SessionSet>()
  for (const set of typedSets) {
    const key = `${set.exercise_id}:${set.reps}`
    const existing = bestPerExerciseReps.get(key)
    if (!existing || set.weight > existing.weight) bestPerExerciseReps.set(key, set)
  }

  const prsHit: {
    exerciseName: string
    reps: number
    weight: number
    previousBest: number | null
    isNewE1rmPr: boolean
    estimatedE1rm: number | null
  }[] = []

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

  return NextResponse.json({ prsHit })
}

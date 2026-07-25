import { supabaseServer } from './supabase-server'

export const SET_TYPES = ['working', 'warmup', 'backoff', 'failure'] as const
export type SetType = (typeof SET_TYPES)[number]
export const DEVIATION_FLAGS = ['deliberate', 'hard_set', 'other'] as const
export type DeviationFlag = (typeof DEVIATION_FLAGS)[number]

export type LogSetInput = {
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

export type LogSetResult =
  | { type: 'needs_rpe'; message: string }
  | { type: 'needs_deviation_flag'; message: string }
  | { type: 'logged'; set: Record<string, unknown> }
  | { type: 'error'; message: string }

function volumeLoad(weight: number, reps: number) {
  return weight * reps
}

// Shared by the manual logger (app/api/sessions/[id]/sets) and chat-based
// logging (app/api/recommend) so the RPE/deviation rules only live in one
// place regardless of which surface a set came in through.
export async function logSet(sessionId: string, input: LogSetInput): Promise<LogSetResult> {
  const { exerciseId, setIndex, setType, weight, reps, rpe, prescribedWeight, prescribedReps, deviationFlag, isLastSet } = input

  if (!exerciseId || setIndex == null || !setType || weight == null || reps == null) {
    return { type: 'error', message: 'Missing required fields' }
  }

  if (!SET_TYPES.includes(setType)) {
    return { type: 'error', message: 'Invalid set_type' }
  }

  // Failure implies RPE 10 by definition -- auto-fill, never ask.
  const resolvedRpe = setType === 'failure' ? 10 : (rpe ?? null)

  // RPE required on the last working/failure set of an exercise. "Last" is
  // determined by the caller (the user marking they're done with this
  // exercise), not inferred here.
  if (isLastSet && (setType === 'working' || setType === 'failure') && resolvedRpe == null) {
    return { type: 'needs_rpe', message: 'RPE is required on the last working set of an exercise.' }
  }

  // Deviation prompt: only working/failure sets, only when the actual
  // combined weight x reps falls more than 5% below what was prescribed.
  // Over-prescribed, warmups, and backoffs never trigger it.
  const requiresDeviationFlag =
    (setType === 'working' || setType === 'failure') &&
    prescribedWeight != null &&
    prescribedReps != null &&
    volumeLoad(weight, reps) < volumeLoad(prescribedWeight, prescribedReps) * 0.95

  if (requiresDeviationFlag && !deviationFlag) {
    return {
      type: 'needs_deviation_flag',
      message: 'This set fell more than 5% below prescribed. Was it deliberate, a hard set, or something else?',
    }
  }

  const { data, error } = await supabaseServer
    .from('session_log')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_index: setIndex,
      set_type: setType,
      weight,
      reps,
      rpe: resolvedRpe,
      prescribed_weight: prescribedWeight ?? null,
      prescribed_reps: prescribedReps ?? null,
      deviation_flag: requiresDeviationFlag ? deviationFlag : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to log set:', error.message)
    return { type: 'error', message: 'Failed to log set' }
  }

  return { type: 'logged', set: data }
}

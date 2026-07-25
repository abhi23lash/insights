import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'

const SET_TYPES = ['working', 'warmup', 'backoff', 'failure'] as const
type SetType = (typeof SET_TYPES)[number]
const DEVIATION_FLAGS = ['deliberate', 'hard_set', 'other'] as const
type DeviationFlag = (typeof DEVIATION_FLAGS)[number]

type LogSetBody = {
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

function volumeLoad(weight: number, reps: number) {
  return weight * reps
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params
  const body: LogSetBody = await req.json()
  const { exerciseId, setIndex, setType, weight, reps, rpe, prescribedWeight, prescribedReps, deviationFlag, isLastSet } = body

  if (!exerciseId || setIndex == null || !setType || weight == null || reps == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!SET_TYPES.includes(setType)) {
    return NextResponse.json({ error: 'Invalid set_type' }, { status: 400 })
  }

  // Failure implies RPE 10 by definition -- auto-fill, never ask.
  const resolvedRpe = setType === 'failure' ? 10 : (rpe ?? null)

  // RPE required on the last working/failure set of an exercise. "Last" is
  // determined by the client (the user marking they're done with this
  // exercise), not inferred here.
  if (isLastSet && (setType === 'working' || setType === 'failure') && resolvedRpe == null) {
    return NextResponse.json(
      { type: 'needs_rpe', message: 'RPE is required on the last working set of an exercise.' },
      { status: 200 }
    )
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
    return NextResponse.json(
      {
        type: 'needs_deviation_flag',
        message: 'This set fell more than 5% below prescribed. Was it deliberate, a hard set, or something else?',
      },
      { status: 200 }
    )
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
    return NextResponse.json({ error: 'Failed to log set' }, { status: 500 })
  }

  return NextResponse.json({ type: 'logged', set: data })
}

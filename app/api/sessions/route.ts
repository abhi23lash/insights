import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

export async function POST(req: NextRequest) {
  const { date, bodyweight, preNotes, fatigueSignal } = await req.json()

  const { data, error } = await supabaseServer
    .from('sessions')
    .insert({
      athlete_id: getCurrentAthleteId(),
      date: date ?? new Date().toISOString().slice(0, 10),
      bodyweight: bodyweight ?? null,
      pre_notes: preNotes ?? null,
      fatigue_signal: fatigueSignal ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create session:', error.message)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json(data)
}

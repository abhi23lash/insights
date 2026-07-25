import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: session, error: sessionError } = await supabaseServer
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (sessionError) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: sets, error: setsError } = await supabaseServer
    .from('session_log')
    .select('*, exercises(name)')
    .eq('session_id', id)
    .order('timestamp')

  if (setsError) {
    console.error('Failed to fetch session sets:', setsError.message)
    return NextResponse.json({ error: 'Failed to fetch session sets' }, { status: 500 })
  }

  return NextResponse.json({ ...session, sets })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { fatigueSignal, postNotes, perceivedSessionQuality } = await req.json()

  const updates: Record<string, unknown> = {}
  if (fatigueSignal !== undefined) updates.fatigue_signal = fatigueSignal
  if (postNotes !== undefined) updates.post_notes = postNotes
  if (perceivedSessionQuality !== undefined) updates.perceived_session_quality = perceivedSessionQuality

  const { data, error } = await supabaseServer.from('sessions').update(updates).eq('id', id).select().single()

  if (error) {
    console.error('Failed to update session:', error.message)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }

  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

export async function GET(req: NextRequest) {
  const activeOnly = req.nextUrl.searchParams.get('active') === 'true'

  let query = supabaseServer
    .from('injury_flags')
    .select('*')
    .eq('athlete_id', getCurrentAthleteId())
    .order('flagged_at', { ascending: false })

  if (activeOnly) query = query.is('resolved_at', null)

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch injury flags:', error.message)
    return NextResponse.json({ error: 'Failed to fetch injury flags' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { bodyPart, severity } = await req.json()

  if (!bodyPart || severity == null) {
    return NextResponse.json({ error: 'bodyPart and severity are required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('injury_flags')
    .insert({ athlete_id: getCurrentAthleteId(), body_part: bodyPart, severity })
    .select()
    .single()

  if (error) {
    console.error('Failed to create injury flag:', error.message)
    return NextResponse.json({ error: 'Failed to create injury flag' }, { status: 500 })
  }

  return NextResponse.json(data)
}

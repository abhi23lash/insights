import { NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

export async function GET() {
  const athleteId = getCurrentAthleteId()

  const { data: sessions } = await supabaseServer.from('sessions').select('*').eq('athlete_id', athleteId)
  const sessionIds = (sessions ?? []).map(s => s.id)

  const [athlete, sessionLog, repMaxPrs, workingLoads, soreness, injuries] = await Promise.all([
    supabaseServer.from('athletes').select('id, created_at, weight_unit').eq('id', athleteId).single(),
    sessionIds.length > 0
      ? supabaseServer.from('session_log').select('*').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabaseServer.from('rep_max_prs').select('*').eq('athlete_id', athleteId),
    supabaseServer.from('working_loads').select('*').eq('athlete_id', athleteId),
    supabaseServer.from('soreness_reports').select('*').eq('athlete_id', athleteId),
    supabaseServer.from('injury_flags').select('*').eq('athlete_id', athleteId),
  ])

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    athlete: athlete.data,
    sessions,
    sessionLog: sessionLog.data,
    repMaxPrs: repMaxPrs.data,
    workingLoads: workingLoads.data,
    soreness: soreness.data,
    injuries: injuries.data,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

// Batch tap-in: one row per muscle group reported, each report is its own
// timestamped event (append, never update) -- "current" soreness for a
// muscle group is just its latest report, read below.
export async function POST(req: NextRequest) {
  const { reports }: { reports: { muscleGroup: string; level: number }[] } = await req.json()

  if (!Array.isArray(reports) || reports.length === 0) {
    return NextResponse.json({ error: 'reports must be a non-empty array' }, { status: 400 })
  }

  const athleteId = getCurrentAthleteId()
  const rows = reports.map(r => ({ athlete_id: athleteId, muscle_group: r.muscleGroup, soreness_level: r.level }))

  const { data, error } = await supabaseServer.from('soreness_reports').insert(rows).select()

  if (error) {
    console.error('Failed to log soreness:', error.message)
    return NextResponse.json({ error: 'Failed to log soreness' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// Latest report per muscle group for the current athlete.
export async function GET() {
  const { data, error } = await supabaseServer
    .from('soreness_reports')
    .select('muscle_group, soreness_level, reported_at')
    .eq('athlete_id', getCurrentAthleteId())
    .order('reported_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch soreness:', error.message)
    return NextResponse.json({ error: 'Failed to fetch soreness' }, { status: 500 })
  }

  const latestByMuscleGroup = new Map<string, (typeof data)[number]>()
  for (const report of data) {
    if (!latestByMuscleGroup.has(report.muscle_group)) latestByMuscleGroup.set(report.muscle_group, report)
  }

  return NextResponse.json([...latestByMuscleGroup.values()])
}

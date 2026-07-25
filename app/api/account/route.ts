import { NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

// Full purge, not unlink: deletes the athletes row, which cascades to
// athlete_identity and every logging table (sessions, session_log,
// rep_max_prs, working_loads, soreness_reports, injury_flags) via the
// on-delete-cascade foreign keys already in the schema.
export async function DELETE() {
  const { error } = await supabaseServer.from('athletes').delete().eq('id', getCurrentAthleteId())

  if (error) {
    console.error('Failed to delete account:', error.message)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}

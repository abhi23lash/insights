import { supabaseServer } from './supabase-server'

// Chat-based logging has no explicit "start session" step, so it needs
// today's session to already exist or get created on first log -- reusing
// whatever session the manual logger (app/log) already started today if
// there is one, rather than fragmenting a single day's training across two
// session rows.
export async function getOrCreateTodaySession(athleteId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing, error: findError } = await supabaseServer
    .from('sessions')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) throw new Error(`Failed to look up today's session: ${findError.message}`)
  if (existing) return existing.id

  const { data: created, error: createError } = await supabaseServer
    .from('sessions')
    .insert({ athlete_id: athleteId, date: today })
    .select('id')
    .single()

  if (createError) throw new Error(`Failed to create today's session: ${createError.message}`)
  return created.id
}

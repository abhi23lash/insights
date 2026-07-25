import { NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('exercises')
    .select('id, name, aliases, movement_pattern, resistance_profile, primary_muscle_group')
    .order('name')

  if (error) {
    console.error('Failed to fetch exercises:', error.message)
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
  }

  return NextResponse.json(data)
}

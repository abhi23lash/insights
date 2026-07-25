import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'

// Only supports resolving -- injury flags aren't otherwise edited.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseServer
    .from('injury_flags')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to resolve injury flag:', error.message)
    return NextResponse.json({ error: 'Failed to resolve injury flag' }, { status: 500 })
  }

  return NextResponse.json(data)
}

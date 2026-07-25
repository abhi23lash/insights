import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/app/lib/supabase-server'
import { getCurrentAthleteId } from '@/app/lib/athlete'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('athletes')
    .select('id, weight_unit')
    .eq('id', getCurrentAthleteId())
    .single()

  if (error) {
    console.error('Failed to fetch athlete:', error.message)
    return NextResponse.json({ error: 'Failed to fetch athlete' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { weightUnit } = await req.json()

  if (weightUnit !== 'lb' && weightUnit !== 'kg') {
    return NextResponse.json({ error: 'weightUnit must be "lb" or "kg"' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('athletes')
    .update({ weight_unit: weightUnit })
    .eq('id', getCurrentAthleteId())
    .select('id, weight_unit')
    .single()

  if (error) {
    console.error('Failed to update athlete:', error.message)
    return NextResponse.json({ error: 'Failed to update athlete' }, { status: 500 })
  }

  return NextResponse.json(data)
}

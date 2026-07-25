import { NextRequest, NextResponse } from 'next/server'
import { logSet, type LogSetInput } from '@/app/lib/logSet'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params
  const body: LogSetInput = await req.json()

  const result = await logSet(sessionId, body)

  if (result.type === 'error') {
    return NextResponse.json({ error: result.message }, { status: result.message === 'Failed to log set' ? 500 : 400 })
  }

  return NextResponse.json(result)
}

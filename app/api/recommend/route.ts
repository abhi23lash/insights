import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { age, trainingAge, goal, daysPerWeek } = await req.json()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are an evidence-based fitness coach. A user has provided the following profile:
- Age: ${age}
- Years training: ${trainingAge}
- Goal: ${goal}
- Days per week available: ${daysPerWeek}

Return a JSON object with exactly these fields:
{
  "recommendation": "a clear, specific training recommendation in 2-3 sentences",
  "confidence": a number between 0 and 100 representing how confident you are based on evidence quality,
  "reasoning": "explain the science and evidence behind this recommendation in 3-4 sentences",
  "whatWouldChangeThis": "what new information or evidence would change this recommendation"
}

Return only valid JSON, no other text.`
      }
    ]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  
  console.log('Claude raw response:', text)

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return NextResponse.json(result)
  } catch (e) {
    console.error('Failed to parse:', text)
    return NextResponse.json({ error: 'Failed to parse response', raw: text }, { status: 500 })
  }
}
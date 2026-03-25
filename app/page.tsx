'use client'

import { useState } from 'react'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const [form, setForm] = useState({
    age: '',
    trainingAge: '',
    goal: '',
    daysPerWeek: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-medium mb-8">Pramana</h1>

      <div className="space-y-4 mb-8">
        <input
          className="w-full border p-3 rounded"
          placeholder="Age"
          value={form.age}
          onChange={e => setForm({ ...form, age: e.target.value })}
        />
        <input
          className="w-full border p-3 rounded"
          placeholder="Years training"
          value={form.trainingAge}
          onChange={e => setForm({ ...form, trainingAge: e.target.value })}
        />
        <input
          className="w-full border p-3 rounded"
          placeholder="Goal (e.g. hypertrophy, strength)"
          value={form.goal}
          onChange={e => setForm({ ...form, goal: e.target.value })}
        />
        <input
          className="w-full border p-3 rounded"
          placeholder="Days per week available"
          value={form.daysPerWeek}
          onChange={e => setForm({ ...form, daysPerWeek: e.target.value })}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded"
        >
          {loading ? 'Analysing...' : 'Get recommendation'}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="border rounded p-4">
            <p className="font-medium">{result.recommendation}</p>
            <p className="text-sm text-gray-500 mt-1">
              Confidence: {result.confidence}%
            </p>
          </div>

          <details className="border rounded p-4">
            <summary className="cursor-pointer font-medium">
              Why this recommendation?
            </summary>
            <p className="mt-3 text-sm text-gray-600">{result.reasoning}</p>
          </details>

          <details className="border rounded p-4">
            <summary className="cursor-pointer font-medium">
              What would change this?
            </summary>
            <p className="mt-3 text-sm text-gray-600">{result.whatWouldChangeThis}</p>
          </details>
        </div>
      )}
    </main>
  )
}
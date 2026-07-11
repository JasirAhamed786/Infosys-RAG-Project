import React, { useState } from 'react'

type Mode = 'Simulator' | 'Manual' | 'Replay'

type ApiResponse = { session_id: string }

const API_BASE = 'http://localhost:8000'

export default function SessionConfig() {
  const [mode, setMode] = useState<Mode>('Simulator')
  const [productContext, setProductContext] = useState('')
  const [scenario, setScenario] = useState('')
  const [persona, setPersona] = useState('')

  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSessionId(null)

    try {
      const res = await fetch(`${API_BASE}/api/sessions/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          product_context: productContext,
          scenario,
          persona: persona.trim() ? persona.trim() : null,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data: ApiResponse = await res.json()
      setSessionId(data.session_id)
    } catch (err: any) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white border rounded-lg p-5">
      <h1 className="text-xl font-semibold mb-4">Create Session</h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <div className="text-sm font-medium mb-2">Mode</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

            {(['Simulator', 'Manual', 'Replay'] as Mode[]).map((m) => (
              <label
                key={m}
                className={
                  mode === m
                    ? 'flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800'
                    : 'flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                }
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="accent-blue-600"
                />
                {m}
              </label>
            ))}
          </div>
        </div>


        <div>
          <label className="block text-sm font-medium mb-1">Product/Service context</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={productContext}
            onChange={(e) => setProductContext(e.target.value)}
            placeholder="e.g., e-commerce returns support"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Customer scenario description</label>
          <textarea
            className="w-full rounded border px-3 py-2 min-h-[110px]"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Describe the customer issue/problem..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Persona (optional)</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="e.g., calm senior agent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>

      {sessionId && (
        <div className="mt-4 rounded bg-green-50 border border-green-200 p-3 text-sm">
          <div className="font-medium text-green-800">Session created</div>
          <div className="text-green-900 break-all">session_id: {sessionId}</div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </section>
  )
}


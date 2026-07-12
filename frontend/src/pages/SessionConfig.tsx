import React, { useMemo, useState } from 'react'
import { createSession, type CreateSessionModeBackend } from '../services/api'

type ModeUi = 'Simulator' | 'Roleplay' | 'Live Assist'

type CreateSessionFormData = {
  mode: ModeUi
  product_context: string
  scenario: string
  persona: string
}

const MODE_MAP: Record<ModeUi, CreateSessionModeBackend> = {
  Simulator: 'Simulator',
  Roleplay: 'Manual',
  'Live Assist': 'Replay',
}

function formatModeBackend(modeUi: ModeUi): string {
  const backend = MODE_MAP[modeUi]
  return `${modeUi} (maps to backend: ${backend})`
}

export default function SessionConfig() {
  const [form, setForm] = useState<CreateSessionFormData>({
    mode: 'Simulator',
    product_context: '',
    scenario: '',
    persona: '',
  })

  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mappedModeText = useMemo(() => formatModeBackend(form.mode), [form.mode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSessionId(null)

    try {
      const payload = {
        mode: MODE_MAP[form.mode],
        product_context: form.product_context,
        scenario: form.scenario,
        persona: form.persona.trim() ? form.persona.trim() : null,
      }

      const data = await createSession(payload)
      setSessionId(data.session_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed due to a server or connection error.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Session Configuration</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1.5">
            Configure parameters to initialize an AI coaching environment tailored to specific business contexts.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Mode Selection */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Coaching Mode
            </label>
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-colors hover:border-gray-300">
              <div className="relative">
                <select
                  value={form.mode}
                  onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value as ModeUi }))}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 transition-all cursor-pointer"
                  disabled={loading}
                >
                  <option value="Simulator">Simulator (Automated AI Roleplay)</option>
                  <option value="Roleplay">Roleplay (Manual Interactive Practice)</option>
                  <option value="Live Assist">Live Assist (Real-time Telemetry & Replay)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2.5 font-mono">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                {mappedModeText}
              </div>
            </div>
          </div>

          {/* Product / Service Context */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Product / Service Context
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 transition-all"
              value={form.product_context}
              onChange={(e) => setForm((prev) => ({ ...prev, product_context: e.target.value }))}
              placeholder="e.g., Retail Banking Support, SaaS Enterprise Sales"
              required
              disabled={loading}
            />
          </div>

          {/* Persona */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Target Persona <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 transition-all"
              value={form.persona}
              onChange={(e) => setForm((prev) => ({ ...prev, persona: e.target.value }))}
              placeholder="e.g., Frustrated Customer, Tier 2 Agent"
              disabled={loading}
            />
          </div>

          {/* Scenario */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Customer Scenario
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm min-h-[130px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 transition-all resize-y leading-relaxed"
              value={form.scenario}
              onChange={(e) => setForm((prev) => ({ ...prev, scenario: e.target.value }))}
              placeholder="Provide context on the user's issue. For example: The customer is calling to dispute a recurring late fee on their credit card after scheduling an automatic payment..."
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-150"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing Cloud Session...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Coaching Session
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Notification Card */}
      {sessionId && (
        <div className="mt-8 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-6 transition-all animate-fadeIn shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">Session Created Successfully</h4>
                <p className="text-xs text-emerald-800 mt-0.5">Your simulation environment is initialized in MongoDB and ready.</p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Session ID (UUID)</span>
              <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-gray-900 bg-white border border-emerald-200 px-3.5 py-2 rounded-xl shadow-sm break-all">
                <span>{sessionId}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Notification Card */}
      {error && (
        <div className="mt-8 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3.5 transition-all animate-fadeIn">
          <div className="shrink-0 text-rose-500 mt-0.5">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-rose-900">Session Initialization Failed</h4>
            <p className="text-sm text-rose-700 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </section>
  )
}
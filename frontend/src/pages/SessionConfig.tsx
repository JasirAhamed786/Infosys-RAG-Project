import React, { useState } from 'react'
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
<section className="rounded-2xl border border-[#d4e3ee] bg-gradient-to-b from-white via-[#f4f9fc] to-[#eef7f3] p-8 shadow-[1px_1px_24px_-10px_rgba(14,116,144,0.25)]">
      {/* Dark hero header band */}
      <div className="rounded-xl border border-[#16283c] bg-gradient-to-r from-[#0A1A2E] via-[#0E2740] to-[#0B2A37] px-6 py-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="brand-grad h-10 w-10 shrink-0 rounded-xl text-white flex items-center justify-center text-base font-bold shadow-[0_4px_14px_rgba(14,116,144,0.5)]">
            C
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-white tracking-tight">Session Configuration</h1>
            <p className="text-[#9DB7CF] text-sm mt-0.5">
              Configure parameters to initialize an AI coaching environment tailored to specific business contexts.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Mode Selection */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#101828] mb-2">
              Coaching Mode
            </label>
<div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors shadow-sm">
              <div className="relative">
                <select
                  value={form.mode}
                  onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value as ModeUi }))}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#101828] focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7] cursor-pointer"
                  disabled={loading}
                >
                  <option value="Simulator">Simulator (Automated AI Roleplay)</option>
                  <option value="Roleplay">Roleplay (Manual Interactive Practice)</option>
                  <option value="Live Assist">Live Assist (Real-time Telemetry & Replay)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#667085]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#667085] mt-2.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0E2B6C]" />
                {form.mode}
              </div>
            </div>
          </div>

          {/* Product / Service Context */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">
              Product / Service Context
              <span className="text-[#F04438] ml-1">*</span>
            </label>
<input
              type="text"
              className="gradient-placeholder w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-[#101828] placeholder-[#98A2B3] focus:border-[#0E2B6C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7] transition-colors"
              value={form.product_context}
              onChange={(e) => setForm((prev) => ({ ...prev, product_context: e.target.value }))}
              placeholder="e.g., Retail Banking Support, SaaS Enterprise Sales"
              required
              disabled={loading}
            />
          </div>

          {/* Persona */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">
              Target Persona <span className="text-xs font-normal text-[#667085]">(Optional)</span>
            </label>
<input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-[#101828] placeholder-[#98A2B3] focus:border-[#0E2B6C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7] transition-colors"
              value={form.persona}
              onChange={(e) => setForm((prev) => ({ ...prev, persona: e.target.value }))}
              placeholder="e.g., Frustrated Customer, Tier 2 Agent"
              disabled={loading}
            />
          </div>

          {/* Scenario */}
          <div className="sm:col-span-2">
<label className="block text-sm font-medium text-[#101828] mb-2">
              Customer Scenario
              <span className="text-[#F04438] ml-1">*</span>
            </label>
<textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-[#101828] placeholder-[#98A2B3] min-h-[130px] focus:border-[#0E2B6C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7] transition-colors resize-y leading-relaxed"
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
className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center rounded-lg brand-grad px-8 py-3.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
        <div className="mt-8 rounded-lg bg-[#E7F7EF] border border-[#B7E8CF] p-6 transition-all animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12B76A] text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#0F6E44]">Session Created Successfully</h4>
                <p className="text-xs text-[#167450] mt-0.5">Your simulation environment is initialized and ready.</p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#12B76A] mb-1">Session ID</span>
              <div className="inline-flex items-center gap-2 font-mono text-xs font-medium text-[#101828] bg-white border border-[#B7E8CF] px-3.5 py-2 rounded-lg break-all">
                <span>{sessionId}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Notification Card */}
      {error && (
        <div className="mt-8 rounded-lg border border-[#F6B5B0] bg-[#FDEBEA] p-4 flex items-start gap-3.5 transition-all animate-fadeIn">
          <div className="shrink-0 text-[#F04438] mt-0.5">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#F04438]">Session Initialization Failed</h4>
            <p className="text-sm text-[#F04438]/90 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </section>
  )
}

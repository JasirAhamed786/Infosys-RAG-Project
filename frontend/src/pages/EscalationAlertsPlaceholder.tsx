import React from 'react'
import { useSession } from '../context/SessionContext'

const RISK_STYLES: Record<string, string> = {
  high: 'bg-rose-50 border-rose-200 text-rose-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-emerald-50 border-emerald-200 text-emerald-700',
}

const RISK_BADGE: Record<string, string> = {
  high: 'bg-rose-600',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

export default function EscalationAlertsPlaceholder() {
  const {
    isSessionActive,
    sessionId,
    latestEscalation,
    escalationHistory,
    turnStatus,
  } = useSession()

  const isLoading = turnStatus === 'pending'
  const riskLevel = latestEscalation?.risk_level ?? 'low'
  const alertTriggered = latestEscalation?.alert_triggered ?? false

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Escalation Alerts</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              Milestone 3
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1.5">
            Detect escalation risk and surface alerts in the coaching console in real time.
          </p>
        </div>
        {isSessionActive && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm self-start sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Monitoring
          </span>
        )}
      </div>

      <div className="mt-8">
        {!isSessionActive ? (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">No active session</h3>
            <p className="mt-1 max-w-md mx-auto text-sm text-slate-500">
              Start a session in the Live Console to monitor escalation risk across every conversation turn.
            </p>
          </div>
        ) : (
          <>
            {/* Top risk banner */}
            {latestEscalation ? (
              <div className={`mb-6 rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${RISK_STYLES[riskLevel] ?? RISK_STYLES.low}`}>
                <div className="shrink-0">
                  {alertTriggered ? (
                    <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-base font-extrabold capitalize">
                      {alertTriggered ? 'Escalation Alert' : 'Risk Level'} — {riskLevel}
                    </div>
                    {alertTriggered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-current px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        <span className={`h-1.5 w-1.5 rounded-full ${RISK_BADGE[riskLevel] ?? 'bg-slate-400'} animate-pulse`} />
                        Alert triggered
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-90 mt-0.5">
                    Session {sessionId ? sessionId.slice(0, 8) : ''}... — {escalationHistory.length} turn(s) analyzed
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="text-2xl font-extrabold">{Math.round((latestEscalation.score ?? 0) )}<span className="text-sm font-medium opacity-70">/100</span></div>
                </div>
              </div>
            ) : (
              <div className={`mb-6 rounded-2xl border p-5 flex items-center gap-4 ${isLoading ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <svg className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-sm font-medium">
                  {isLoading ? 'Analyzing escalation risk for the latest turn...' : 'No escalation data yet for this session.'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alert Queue */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-900">Alert Queue</div>
                    <div className="text-xs text-slate-500 mt-0.5">Latest turn and recent escalation history</div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-full">
                    {escalationHistory.length} turn(s)
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {latestEscalation && (
                    <div className="rounded-xl bg-white border-l-4 shadow-sm p-4"
                      style={{ borderLeftColor: riskLevel === 'high' ? '#f43f5e' : riskLevel === 'medium' ? '#f59e0b' : '#10b981' }}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Latest Turn Risk</span>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${RISK_STYLES[riskLevel] ?? RISK_STYLES.low}`}>
                          {riskLevel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${RISK_BADGE[riskLevel] ?? 'bg-emerald-500'}`} style={{ width: `${Math.min(100, latestEscalation.score ?? 0)}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">{Math.round(latestEscalation.score ?? 0)}</span>
                      </div>
                      {latestEscalation.recommended_action && (
                        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Recommended: </span>
                          {latestEscalation.recommended_action}
                        </div>
                      )}
                    </div>
                  )}

                  {escalationHistory.slice(0, 3).map((entry, idx) => (
                    <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Turn {entry.turnIndex}</span>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${RISK_STYLES[entry.escalation.risk_level] ?? RISK_STYLES.low}`}>
                          {entry.escalation.risk_level}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${RISK_BADGE[entry.escalation.risk_level] ?? 'bg-emerald-500'}`} style={{ width: `${Math.min(100, entry.escalation.score ?? 0)}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{Math.round(entry.escalation.score ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reasoning */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="text-sm font-bold text-gray-900">Why this is flagged</div>
                </div>

                <div className="mt-5 space-y-3">
                  {latestEscalation?.reasoning?.length ? (
                    latestEscalation.reasoning.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                        <div className="flex-1 text-sm text-slate-700 leading-relaxed">{reason}</div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-40 text-sm text-slate-400">
                      {isLoading
                        ? 'Analyzing the latest turn for escalation signals...'
                        : 'No escalation flags raised for the latest turn.'}
                    </div>
                  )}
                </div>

                {latestEscalation && (
                  <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-500">Escalation Risk Score</div>
                    <div className={`text-xl font-extrabold ${riskLevel === 'high' ? 'text-rose-600' : riskLevel === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {Math.round(latestEscalation.score ?? 0)}
                      <span className="text-sm text-slate-400 font-medium">/100</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}


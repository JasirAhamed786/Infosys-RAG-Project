import React from 'react'
import ComingSoonBase from './ComingSoonBase'
import { useSession } from '../context/SessionContext'

const RISK_STYLES: Record<string, string> = {
  high: 'bg-rose-50 border-rose-200 text-rose-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-emerald-50 border-emerald-200 text-emerald-700',
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

  return (
    <ComingSoonBase
      title="Escalation Alerts"
      description="Detect escalation risk and surface alerts in the coaching console."
      milestone="Milestone 3"
      badgeColor="rose"
    >
      {!isSessionActive ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">No active session</div>
              <div className="text-sm text-gray-500">
                Start a session in the Live Console to see live escalation risk here.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alert Queue — latest escalation + history */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-gray-900">Alert Queue</div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Session {sessionId ? sessionId.slice(0, 8) : ''}... — {escalationHistory.length} turn(s) analyzed
            </div>

            <div className="mt-4 space-y-3">
              {latestEscalation ? (
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Latest Turn Risk
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${RISK_STYLES[latestEscalation.risk_level] ?? RISK_STYLES.low}`}>
                      {latestEscalation.risk_level}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-800">
                    Score: {Math.round((latestEscalation.score ?? 0) * 100)}%
                  </div>
                  {latestEscalation.reasoning?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {latestEscalation.reasoning.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">
                    {isLoading ? 'Analyzing escalation risk...' : 'No escalation data yet for this turn.'}
                  </div>
                </div>
              )}

              {escalationHistory.slice(0, 3).map((entry, idx) => (
                <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Turn {entry.turnIndex}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${RISK_STYLES[entry.escalation.risk_level] ?? RISK_STYLES.low}`}>
                      {entry.escalation.risk_level}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-800">
                    Score: {Math.round((entry.escalation.score ?? 0) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why this is flagged */}
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-6">
            <div className="text-sm font-semibold text-gray-900">Why this is flagged</div>
            <div className="mt-3 space-y-3">
              {latestEscalation?.reasoning?.length ? (
                latestEscalation.reasoning.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    <div className="flex-1 text-sm text-slate-700 leading-relaxed">{reason}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  {isLoading
                    ? 'Analyzing the latest turn for escalation signals...'
                    : 'No escalation flags raised for the latest turn.'}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
              {isSessionActive
                ? 'Live escalation scoring and reasons are now shown from the active session pipeline output.'
                : 'Escalation scoring and reasons will be implemented in Milestone 3.'}
            </div>
          </div>
        </div>
      )}
    </ComingSoonBase>
  )
}

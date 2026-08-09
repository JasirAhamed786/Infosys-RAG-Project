import React from 'react'
import { useSession } from '../context/SessionContext'

const RISK_STYLES: Record<string, string> = {
  high: 'bg-[#FDEBEA] border-[#F6B5B0] text-[#F04438]',
  medium: 'bg-[#FEF3E2] border-[#FAD9A8] text-[#B26A00]',
  low: 'bg-[#E7F7EF] border-[#B7E8CF] text-[#12B76A]',
}

const RISK_BADGE: Record<string, string> = {
  high: 'bg-[#F04438]',
  medium: 'bg-[#F79009]',
  low: 'bg-[#12B76A]',
}

// Signature risk indicator: left-border + tint matching risk level
const RISK_PANEL: Record<string, string> = {
  high: 'border-l-[#F04438]',
  medium: 'border-l-[#F79009]',
  low: 'border-l-[#12B76A]',
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
<section className="gradient-surface p-8 max-w-7xl mx-auto w-full">
      {/* ── Dark hero header band ── */}
      <div className="rounded-xl border border-[#16283c] bg-gradient-to-r from-[#0A1A2E] via-[#0E2740] to-[#0B2A37] px-6 py-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-grad h-10 w-10 shrink-0 rounded-xl text-white flex items-center justify-center text-base font-bold shadow-[0_4px_14px_rgba(14,116,144,0.5)]">
              C
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-semibold text-white tracking-tight">Escalation Alerts</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F6B5B0] bg-[#FDEBEA] px-3 py-1 text-xs font-medium text-[#F04438]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F04438]" />
                  Live
                </span>
              </div>
              <p className="text-[#9DB7CF] text-sm mt-1">
                Detect escalation risk and surface alerts in the coaching console in real time.
              </p>
            </div>
          </div>
          {isSessionActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B7E8CF] bg-[#E7F7EF] px-3 py-1 text-xs font-medium text-[#12B76A] self-start sm:self-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
              Live Monitoring
            </span>
          )}
        </div>
      </div>

      <div className="mt-8">
        {!isSessionActive ? (
          <div className="rounded-[8px] border border-[#E4E7EC] bg-[#FAFBFC] p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-lg bg-[#FDEBEA] text-[#F04438] flex items-center justify-center">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-medium text-[#101828]">No active session</h3>
            <p className="mt-1 max-w-md mx-auto text-sm text-[#667085]">
              Start a session in the Live Console to monitor escalation risk across every conversation turn.
            </p>
          </div>
        ) : (
          <>
            {/* Top risk banner — signature risk indicator */}
            {latestEscalation ? (
              <div className={`mb-6 rounded-[8px] border-l-4 p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${RISK_STYLES[riskLevel] ?? RISK_STYLES.low} ${RISK_PANEL[riskLevel] ?? RISK_PANEL.low}`}>
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
                    <div className="text-base font-semibold capitalize">
                      {alertTriggered ? 'Escalation Alert' : 'Risk Level'} — {riskLevel}
                    </div>
                    {alertTriggered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        <span className={`h-1.5 w-1.5 rounded-full ${RISK_BADGE[riskLevel] ?? 'bg-[#98A2B3]'} animate-pulse`} />
                        Alert triggered
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-90 mt-0.5">
                    Session <span className="font-mono">{sessionId ? sessionId.slice(0, 8) : ''}</span>... — {escalationHistory.length} turn(s) analyzed
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="text-2xl font-semibold font-mono">{Math.round((latestEscalation.score ?? 0) )}<span className="text-sm font-medium opacity-70">/100</span></div>
                </div>
              </div>
            ) : (
              <div className={`mb-6 rounded-[8px] border p-5 flex items-center gap-4 ${isLoading ? 'bg-[#FAFBFC] border-[#E4E7EC]' : 'bg-[#E7F7EF] border-[#B7E8CF] text-[#12B76A]'}`}>
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
              <div className="rounded-[8px] border border-[#E4E7EC] bg-[#FAFBFC] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#101828]">Alert Queue</div>
                    <div className="text-xs text-[#667085] mt-0.5">Latest turn and recent escalation history</div>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#667085] bg-[#F2F4F7] px-2.5 py-1 rounded-full">
                    {escalationHistory.length} turn(s)
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {latestEscalation && (
                    <div className={`rounded-lg bg-white border border-l-4 border-[#E4E7EC] p-4 ${RISK_PANEL[riskLevel] ?? RISK_PANEL.low}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#98A2B3]">Latest Turn Risk</span>
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${RISK_STYLES[riskLevel] ?? RISK_STYLES.low}`}>
                          {riskLevel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[#EAECF0] overflow-hidden">
                          <div className={`h-full rounded-full ${RISK_BADGE[riskLevel] ?? 'bg-[#12B76A]'}`} style={{ width: `${Math.min(100, latestEscalation.score ?? 0)}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-[#101828] font-mono">{Math.round(latestEscalation.score ?? 0)}</span>
                      </div>
                      {latestEscalation.recommended_action && (
                        <div className="mt-3 rounded-lg bg-[#F2F4F7] border border-[#E4E7EC] px-3 py-2 text-xs text-[#344054]">
                          <span className="font-medium text-[#101828]">Recommended: </span>
                          {latestEscalation.recommended_action}
                        </div>
                      )}
                    </div>
                  )}

                  {escalationHistory.slice(0, 3).map((entry, idx) => (
                    <div key={idx} className="rounded-lg bg-white border border-[#E4E7EC] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[#98A2B3]">{`Turn ${entry.turnIndex}`}</span>
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${RISK_STYLES[entry.escalation.risk_level] ?? RISK_STYLES.low}`}>
                          {entry.escalation.risk_level}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[#EAECF0] overflow-hidden">
                          <div className={`h-full rounded-full ${RISK_BADGE[entry.escalation.risk_level] ?? 'bg-[#12B76A]'}`} style={{ width: `${Math.min(100, entry.escalation.score ?? 0)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-[#344054] font-mono">{Math.round(entry.escalation.score ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reasoning */}
              <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-6">
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-[#F04438]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="text-sm font-semibold text-[#101828]">Why this is flagged</div>
                </div>

                <div className="mt-5 space-y-3">
                  {latestEscalation?.reasoning?.length ? (
                    latestEscalation.reasoning.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border border-[#E4E7EC] bg-[#FAFBFC] p-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-[#F04438] shrink-0" />
                        <div className="flex-1 text-sm text-[#344054] leading-relaxed">{reason}</div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-40 text-sm text-[#98A2B3]">
                      {isLoading
                        ? 'Analyzing the latest turn for escalation signals...'
                        : 'No escalation flags raised for the latest turn.'}
                    </div>
                  )}
                </div>

                {latestEscalation && (
                  <div className="mt-6 flex items-center justify-between rounded-lg border border-[#E4E7EC] bg-[#F2F4F7] px-4 py-3">
                    <div className="text-xs font-medium text-[#667085]">Escalation Risk Score</div>
                    <div className="text-xl font-semibold font-mono text-[#101828]">
                      {Math.round(latestEscalation.score ?? 0)}
                      <span className="text-sm text-[#98A2B3] font-medium">/100</span>
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


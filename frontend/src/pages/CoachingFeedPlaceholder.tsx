import React from 'react'
import { useSession } from '../context/SessionContext'

export default function CoachingFeedPlaceholder() {
  const {
    isSessionActive,
    sessionId,
    latestCoachingSuggestion,
    turnStatus,
  } = useSession()

  const isLoading = turnStatus === 'pending'

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Coaching Feed</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              Milestone 3
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1.5">
            Agent coaching tips, response drafts, and next-best actions delivered in real time.
          </p>
        </div>
        {isSessionActive && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm self-start sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Session
          </span>
        )}
      </div>

      <div className="mt-8">
        {!isSessionActive ? (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">No active session</h3>
            <p className="mt-1 max-w-md mx-auto text-sm text-slate-500">
              Start a session in the Live Console to see live, AI-generated coaching suggestions delivered here as each turn is analyzed.
            </p>
          </div>
        ) : latestCoachingSuggestion ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coaching Tips */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/40 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-gray-900">Coaching Tips</div>
                  <div className="text-xs text-slate-500 mt-0.5">Session {sessionId ? sessionId.slice(0, 8) : ''}... — latest turn</div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                  {latestCoachingSuggestion.coaching_tips?.length ?? 0} suggestion(s)
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {(latestCoachingSuggestion.coaching_tips ?? []).length > 0 ? (
                  latestCoachingSuggestion.coaching_tips!.map((tip, idx) => (
                    <div key={idx} className="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 flex gap-4">
                      <div className="shrink-0 h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold flex items-center justify-center border border-indigo-100">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tip {idx + 1}</div>
                        <p className="mt-1 text-sm text-slate-800 leading-relaxed">{tip}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-white border border-slate-200 p-4 text-sm text-slate-500">
                    No coaching tips available for this turn.
                  </div>
                )}

                {(latestCoachingSuggestion.communication_tips ?? []).length > 0 && (
                  <div className="rounded-xl bg-white border border-slate-200 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Communication Tips</div>
                    <ul className="space-y-1.5">
                      {latestCoachingSuggestion.communication_tips!.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Response */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col">
              <div className="flex items-center gap-2.5">
                <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-sm font-bold text-gray-900">Suggested Response</div>
              </div>
              <div className="flex-1 mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {latestCoachingSuggestion.suggested_response || 'No suggested response available for this turn.'}
                </p>
              </div>

              {latestCoachingSuggestion.tone_feedback && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">Tone Feedback</div>
                  <p className="text-sm text-amber-900 leading-relaxed">{latestCoachingSuggestion.tone_feedback}</p>
                </div>
              )}

              {typeof latestCoachingSuggestion.confidence === 'number' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>Model Confidence</span>
                    <span>{Math.round(latestCoachingSuggestion.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, (latestCoachingSuggestion.confidence ?? 0) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="rounded-xl bg-white border border-slate-200 p-5">
                      <div className="h-3 bg-slate-200 rounded w-1/4 animate-pulse" />
                      <div className="mt-3 h-3 bg-slate-200 rounded w-full animate-pulse" />
                      <div className="mt-2 h-3 bg-slate-200 rounded w-3/4 animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-5">
                  <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
                  <div className="mt-4 h-20 bg-slate-200 rounded w-full animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900">Awaiting first turn</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Coaching suggestions will appear here after the first conversation turn is analyzed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}


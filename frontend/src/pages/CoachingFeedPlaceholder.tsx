import React from 'react'
import ComingSoonBase from './ComingSoonBase'
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
    <ComingSoonBase
      title="Coaching Feed"
      description="Agent coaching tips, response drafts, and next-best actions."
      milestone="Milestone 3"
      badgeColor="indigo"
    >
      {!isSessionActive ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">No active session</div>
              <div className="text-sm text-gray-500">
                Start a session in the Live Console to see live coaching suggestions here.
              </div>
            </div>
          </div>
        </div>
      ) : latestCoachingSuggestion ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Live Coaching Feed</div>
              <div className="text-xs text-slate-500 mt-1">
                Session {sessionId ? sessionId.slice(0, 8) : ''}... — latest turn recommendations
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {(latestCoachingSuggestion.coaching_tips ?? []).map((tip, idx) => (
              <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tip {idx + 1}</div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    live
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-800 leading-relaxed">{tip}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-gray-900">Suggested Response Draft</div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              {latestCoachingSuggestion.suggested_response || 'No suggested response available for this turn.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4">
                  <div className="h-3 bg-slate-200 rounded w-1/4 animate-pulse" />
                  <div className="mt-3 h-3 bg-slate-200 rounded w-full animate-pulse" />
                  <div className="mt-2 h-3 bg-slate-200 rounded w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Awaiting first turn</div>
                <div className="text-sm text-gray-500">
                  Coaching suggestions will appear after the first conversation turn is analyzed.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ComingSoonBase>
  )
}

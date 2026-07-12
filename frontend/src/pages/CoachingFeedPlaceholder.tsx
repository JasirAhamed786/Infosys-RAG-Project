import React from 'react'
import ComingSoonBase from './ComingSoonBase'

export default function CoachingFeedPlaceholder() {
  return (
    <ComingSoonBase
      title="Coaching Feed"
      description="Agent coaching tips, response drafts, and next-best actions."
      milestone="Milestone 3"
      badgeColor="indigo"
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Example Feed Items</div>
            <div className="text-xs text-slate-500 mt-1">Mock placeholders to validate UI layout.</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tip {idx + 1}</div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  normal
                </span>
              </div>
              <div className="mt-2 h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
              <div className="mt-2 h-4 bg-slate-200 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white/70 p-4">
          <div className="text-sm font-semibold text-gray-900">Suggested Response Draft</div>
          <div className="mt-2 h-4 bg-slate-200 rounded w-5/6 animate-pulse" />
          <div className="mt-2 h-4 bg-slate-200 rounded w-4/5 animate-pulse" />
          <div className="mt-2 h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    </ComingSoonBase>
  )
}


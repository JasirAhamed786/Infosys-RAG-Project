import React from 'react'
import ComingSoonBase from './ComingSoonBase'

export default function AnalyticsDashboardPlaceholder() {
  return (
    <ComingSoonBase
      title="Analytics Dashboard"
      description="Performance analytics across sessions (coaching effectiveness + escalation outcomes)."
      milestone="Milestone 4"
      badgeColor="emerald"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Escalation Risk Trend</div>
              <div className="text-xs text-slate-500 mt-1">Placeholder chart shape</div>
            </div>
          </div>
          <div className="mt-5 h-56 rounded-xl bg-white/70 border border-slate-200 p-4">
            <div className="h-10 bg-slate-200/80 rounded animate-pulse" />
            <div className="mt-3 grid grid-cols-3 gap-3 h-[76%] items-end">
              <div className="bg-slate-200 rounded w-full h-2/3 animate-pulse" />
              <div className="bg-slate-200 rounded w-full h-3/5 animate-pulse" />
              <div className="bg-slate-200 rounded w-full h-4/5 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-6">
          <div className="text-sm font-semibold text-gray-900">Coaching Tip Effectiveness</div>
          <div className="text-xs text-slate-500 mt-1">Placeholder chart shape</div>
          <div className="mt-5 h-56 rounded-xl bg-white/70 border border-slate-200 p-4">
            <div className="h-10 bg-slate-200/80 rounded animate-pulse" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-16 h-3 bg-slate-200 rounded animate-pulse" />
                  <div className="flex-1 h-3 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ComingSoonBase>
  )
}


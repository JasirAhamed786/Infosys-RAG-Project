import React from 'react'
import ComingSoonBase from './ComingSoonBase'

export default function EscalationAlertsPlaceholder() {
  return (
    <ComingSoonBase
      title="Escalation Alerts"
      description="Detect escalation risk and surface alerts in the coaching console."
      milestone="Milestone 3"
      badgeColor="rose"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="text-sm font-semibold text-gray-900">Alert Queue</div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alert</span>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">medium</span>
                </div>
                <div className="mt-2 h-4 bg-slate-200 rounded w-4/5 animate-pulse" />
                <div className="mt-2 h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-6">
          <div className="text-sm font-semibold text-gray-900">Why this is flagged</div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            Placeholder UI only. Escalation scoring and reasons will be implemented in Milestone 3.
          </div>
        </div>
      </div>
    </ComingSoonBase>
  )
}


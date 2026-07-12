import React from 'react'
import ComingSoonBase from './ComingSoonBase'

export default function ReportsPlaceholder() {
  return (
    <ComingSoonBase
      title="Post-Interaction Reports"
      description="Session summary and performance metrics after each interaction."
      milestone="Milestone 4"
      badgeColor="blue"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <div className="text-sm font-semibold text-gray-900">Session Summary</div>
          <div className="mt-3 h-5 bg-slate-200 rounded w-4/5 animate-pulse" />
          <div className="mt-2 h-5 bg-slate-200 rounded w-full animate-pulse" />
          <div className="mt-2 h-5 bg-slate-200 rounded w-3/4 animate-pulse" />

          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-900">Key Actions</div>
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-6">
          <div className="text-sm font-semibold text-gray-900">Metrics</div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
                <div className="mt-2 h-4 bg-slate-200 rounded w-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ComingSoonBase>
  )
}


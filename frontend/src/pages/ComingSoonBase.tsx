import React from 'react'

export type ComingSoonMilestone = 'Milestone 2' | 'Milestone 3' | 'Milestone 4'

type Props = {
  title: string
  description: string
  milestone: ComingSoonMilestone
  badgeColor?: 'blue' | 'indigo' | 'emerald' | 'rose'
  children?: React.ReactNode
}

const BADGE: Record<NonNullable<Props['badgeColor']>, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
}

export default function ComingSoonBase({ title, description, milestone, badgeColor = 'indigo', children }: Props) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${BADGE[badgeColor]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {milestone}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1.5">{description}</p>
        </div>
      </div>

      <div className="mt-8">
        {children ?? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8h.01M12 12h.01M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Coming soon</div>
                <div className="text-sm text-gray-500">This module will be fully implemented in the milestone marked above.</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse" />
                <div className="mt-3 h-3 bg-slate-200 rounded w-full animate-pulse" />
                <div className="mt-3 h-3 bg-slate-200 rounded w-5/6 animate-pulse" />
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse" />
                <div className="mt-3 h-3 bg-slate-200 rounded w-full animate-pulse" />
                <div className="mt-3 h-3 bg-slate-200 rounded w-4/5 animate-pulse" />
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="h-3 bg-slate-200 rounded w-3/4 animate-pulse" />
                <div className="mt-3 h-3 bg-slate-200 rounded w-full animate-pulse" />
                <div className="mt-3 h-3 bg-slate-200 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}


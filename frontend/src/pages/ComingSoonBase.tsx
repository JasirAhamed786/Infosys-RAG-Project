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
  blue: 'bg-[#E9EDF6] border-[#C7D2E8] text-[#0E2B6C]',
  indigo: 'bg-[#E9EDF6] border-[#C7D2E8] text-[#0E2B6C]',
  emerald: 'bg-[#E7F7EF] border-[#B7E8CF] text-[#12B76A]',
  rose: 'bg-[#FDEBEA] border-[#F6B5B0] text-[#F04438]',
}

export default function ComingSoonBase({ title, description, milestone, badgeColor = 'indigo', children }: Props) {
  return (
    <section className="gradient-surface p-8">
      {/* ── Dark hero header band ── */}
      <div className="rounded-xl border border-[#16283c] bg-gradient-to-r from-[#0A1A2E] via-[#0E2740] to-[#0B2A37] px-6 py-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-grad h-10 w-10 shrink-0 rounded-xl text-white flex items-center justify-center text-base font-bold shadow-[0_4px_14px_rgba(14,116,144,0.5)]">
              C
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-semibold text-white tracking-tight">{title}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${BADGE[badgeColor]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {milestone}
                </span>
              </div>
              <p className="text-[#9DB7CF] text-sm mt-1">{description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {children ?? (
          <div className="rounded-[8px] border border-[#E4E7EC] bg-[#FAFBFC] p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#F2F4F7] text-[#667085] flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8h.01M12 12h.01M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-[#101828]">Coming soon</div>
                <div className="text-sm text-[#667085]">This module will be fully implemented in the milestone marked above.</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white border border-[#E4E7EC] p-4">
                <div className="h-3 bg-[#E4E7EC] rounded w-2/3 animate-pulse" />
                <div className="mt-3 h-3 bg-[#E4E7EC] rounded w-full animate-pulse" />
                <div className="mt-3 h-3 bg-[#E4E7EC] rounded w-5/6 animate-pulse" />
              </div>
              <div className="rounded-lg bg-white border border-[#E4E7EC] p-4">
                <div className="h-3 bg-[#E4E7EC] rounded w-1/2 animate-pulse" />
                <div className="mt-3 h-3 bg-[#E4E7EC] rounded w-full animate-pulse" />
                <div className="mt-3 h-3 bg-[#E4E7EC] rounded w-4/5 animate-pulse" />
              </div>
              <div className="rounded-lg bg-white border border-[#E4E7EC] p-4">
                <div className="h-3 bg-[#E4E7EC] rounded w-3/4 animate-pulse" />
                <div className="mt-3 h-3 bg-[#E4E7EC] rounded w-full animate-pulse" />
                <div className="mt-3 h-3 bg-[#E4E7EC] rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}


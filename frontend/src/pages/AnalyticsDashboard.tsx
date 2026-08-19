import React, { useEffect, useState } from 'react'
import { getAnalyticsDashboard, type AnalyticsDashboardResponse } from '../services/api'

function percent(value: number, max: number) {
  return max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAnalyticsDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  const frustrationMax = Math.max(...(data?.frustration_trend.map((item) => item.average_frustration) ?? [0]), 1)
  const intentMax = Math.max(...(data?.common_intents.map((item) => item.count) ?? [0]), 1)

  return (
    <section className="min-h-[calc(100vh-3rem)] bg-slate-50 -mx-4 md:-mx-8 px-4 md:px-8 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Performance analytics</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Coaching overview</h1><p className="mt-2 text-sm text-slate-500">A compact view of session volume, resolution quality, and customer friction.</p></div>
        {error && <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Total sessions</p><p className="mt-3 text-3xl font-semibold text-slate-900">{loading ? '—' : data?.total_sessions ?? 0}</p><p className="mt-2 text-xs text-slate-400">All configured support interactions</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Avg. resolution score</p><p className="mt-3 text-3xl font-semibold text-teal-700">{loading ? '—' : `${data?.average_resolution_score ?? 0}/100`}</p><p className="mt-2 text-xs text-slate-400">Across generated session reports</p></div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Frustration trend</h2><p className="mt-1 text-xs text-slate-400">Average customer frustration by recent session</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">0–100</span></div><div className="mt-7 space-y-5">{!loading && !data?.frustration_trend.length && <p className="text-sm text-slate-400">No customer sentiment data yet.</p>}{data?.frustration_trend.map((item) => <div key={item.session_id}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">{item.session_id.slice(0, 8)}</span><span className="text-slate-400">{item.average_frustration}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${percent(item.average_frustration, frustrationMax)}%` }} /></div></div>)}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-sm font-semibold text-slate-900">Common intents</h2><p className="mt-1 text-xs text-slate-400">Most frequent customer needs across messages</p></div><div className="mt-7 space-y-5">{!loading && !data?.common_intents.length && <p className="text-sm text-slate-400">No intent data yet.</p>}{data?.common_intents.map((item) => <div key={item.intent}><div className="mb-2 flex justify-between text-xs"><span className="font-medium capitalize text-slate-600">{item.intent.replaceAll('_', ' ')}</span><span className="text-slate-400">{item.count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${percent(item.count, intentMax)}%` }} /></div></div>)}</div></div>
        </div>
      </div>
    </section>
  )
}
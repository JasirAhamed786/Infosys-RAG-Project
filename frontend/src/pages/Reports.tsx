import React, { useEffect, useState } from 'react'
import { getReport, listSessions, type SessionListItem, type SessionReportResponse } from '../services/api'

function scoreTone(score: number) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-rose-700 bg-rose-50 border-rose-200'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function Reports() {
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [report, setReport] = useState<SessionReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listSessions()
      .then((data) => {
        const completed = data.sessions.filter((session) => session.status === 'completed')
        setSessions(completed)
        if (completed[0]) setSelectedId(completed[0].session_id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load sessions.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setReport(null)
      return
    }
    setDetailLoading(true)
    setError(null)
    getReport(selectedId)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load report.'))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  return (
    <section className="min-h-[calc(100vh-3rem)] bg-slate-50 -mx-4 md:-mx-8 px-4 md:px-8 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Performance review</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Interaction reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Review completed coaching sessions and turn-level customer sentiment.</p>
        </div>

        {error && <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between px-2 pb-3">
              <h2 className="text-sm font-semibold text-slate-900">Completed sessions</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{sessions.length}</span>
            </div>
            {loading && <p className="px-2 py-6 text-sm text-slate-400">Loading sessions...</p>}
            {!loading && sessions.length === 0 && <p className="px-2 py-6 text-sm leading-6 text-slate-400">No completed sessions yet. Finish an interaction to generate its report.</p>}
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => setSelectedId(session.session_id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${selectedId === session.session_id ? 'border-teal-200 bg-teal-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="truncate text-sm font-medium text-slate-800">{session.product_context || 'Support session'}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{formatDate(session.created_at)}</span>
                    <span>{session.mode}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            {detailLoading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-400 shadow-sm">Loading report...</div>}
            {!detailLoading && !report && !loading && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">Select a completed session to view its report.</div>}
            {!detailLoading && report && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Session report</p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">Interaction summary</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{report.interaction_summary}</p>
                    </div>
                    <div className={`shrink-0 rounded-lg border px-4 py-3 text-center ${scoreTone(report.resolution_quality_score)}`}>
                      <div className="text-3xl font-semibold">{report.resolution_quality_score}</div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider">Resolution score</div>
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${report.resolution_quality_score}%` }} />
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900">Customer sentiment journey</h2>
                    <div className="mt-5 space-y-4">
                      {report.sentiment_timeline.length === 0 && <p className="text-sm text-slate-400">No sentiment data was recorded.</p>}
                      {report.sentiment_timeline.map((item) => (
                        <div key={`${item.turn_index}-${item.sentiment}`} className="flex gap-3">
                          <div className="flex flex-col items-center"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-600" /><span className="mt-1 h-full w-px bg-slate-200" /></div>
                          <div className="flex-1 pb-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium capitalize text-slate-800">Turn {item.turn_index}: {item.sentiment}</span><span className="text-xs text-slate-400">{item.frustration_score}/100 frustration</span></div>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${item.frustration_score}%` }} /></div>
                            <p className="mt-1 text-xs capitalize text-slate-400">Satisfaction {item.satisfaction_trend}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900">Coaching recommendations</h2>
                    <div className="mt-5 space-y-3">
                      {report.coaching_recommendations.map((recommendation, index) => <div key={`${recommendation}-${index}`} className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-sm leading-6 text-slate-700"><span className="mr-2 font-semibold text-teal-700">0{index + 1}</span>{recommendation}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
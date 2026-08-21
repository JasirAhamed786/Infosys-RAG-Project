import React, { useEffect, useState } from 'react'
import { FileText, CheckCircle, TrendingUp, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { useSession } from '../context/SessionContext'

interface ReportDoc {
  _id: string
  session_id: string
  mode: string
  product_context: string
  scenario: string
  interaction_summary: string
  resolution_quality_score: number
  sentiment_journey: Array<{ turn: number; customer_sentiment: string; score: number; summary: string }>
  coaching_recommendations: string[]
  escalation_triggers: string[]
  knowledge_gaps: string[]
  created_at: string
}

export default function ReportsPlaceholder() {
  const { sessionId: currentSessionId } = useSession()
  const [reports, setReports] = useState<ReportDoc[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportDoc | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [generating, setGenerating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/api/reports')
      if (!res.ok) throw new Error('Failed to load reports')
      const data = await res.json()
      setReports(data.reports || [])
      if (data.reports && data.reports.length > 0) {
        setSelectedReport(data.reports[0])
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleGenerateCurrent = async () => {
    if (!currentSessionId) return
    setGenerating(true)
    try {
      const res = await fetch(`http://localhost:8000/api/reports/generate/${currentSessionId}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to generate report for current session')
      const newReport = await res.json()
      await fetchReports()
      setSelectedReport(newReport)
    } catch (err: any) {
      alert(err.message || 'Report generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 h-full max-w-[1600px] mx-auto w-full pb-12">
      {/* Header Band */}
      <div className="shrink-0 rounded-2xl border border-[#16283c] bg-gradient-to-r from-[#0A1A2E] via-[#0E2740] to-[#0B2A37] p-5 md:p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C7D2E8] bg-gradient-to-r from-[#E9EDF6] to-[#E7F7EF] px-3.5 py-1 text-xs font-medium text-[#0E2B6C]">
              <FileText className="w-3.5 h-3.5" /> Post-Interaction Analytics
            </div>
            <h1 className="mt-2.5 text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">
              Interaction Reports & Debriefs
            </h1>
            <p className="mt-1 text-sm text-[#9DB7CF]">
              AI-generated evaluations, sentiment journey progression, and agent resolution quality scoring.
            </p>
          </div>
          {currentSessionId && (
            <button
              onClick={handleGenerateCurrent}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg brand-grad px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Analyzing Session...' : 'Generate Report for Active Session'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0E2B6C]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Reports Generated Yet</h3>
          <p className="text-sm text-slate-500 mt-1">Complete a support simulation or manual turn to generate your first AI debrief.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* List Column */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Available Session Reports</h3>
            {reports.map((r) => (
              <div
                key={r._id}
                onClick={() => setSelectedReport(r)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedReport?._id === r._id
                    ? 'border-[#0E2B6C] bg-white shadow-md ring-2 ring-[#0E2B6C]/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {r.mode || 'Simulator'} Mode
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    r.resolution_quality_score >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {r.resolution_quality_score}/100
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 truncate">{r.product_context || 'General Inquiry'}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.interaction_summary}</p>
                <div className="text-[11px] text-slate-400 mt-2">
                  {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          {/* Details Column */}
          {selectedReport && (
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0E2B6C]">Executive Summary</span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedReport.product_context}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Resolution Score</div>
                    <div className="text-2xl font-black text-[#0E2B6C]">{selectedReport.resolution_quality_score}/100</div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedReport.interaction_summary}
                </p>
              </div>

              {/* Sentiment Timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0E7490]" /> Customer Sentiment Journey
                </h3>
                <div className="space-y-3">
                  {selectedReport.sentiment_journey?.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className="font-semibold text-xs text-slate-500 w-16">Turn {step.turn}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md capitalize ${
                        step.score > 60 ? 'bg-red-50 text-red-700' : step.score > 35 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {step.customer_sentiment} ({step.score}/100)
                      </span>
                      <span className="text-xs text-slate-600 truncate flex-1">{step.summary}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coaching & Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Coaching Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {selectedReport.coaching_recommendations?.map((tip, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Triggers & Gaps
                  </h3>
                  <div className="space-y-2">
                    {selectedReport.escalation_triggers?.map((t, idx) => (
                      <div key={idx} className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                        <strong>Trigger:</strong> {t}
                      </div>
                    ))}
                    {selectedReport.knowledge_gaps?.map((g, idx) => (
                      <div key={idx} className="text-xs text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                        <strong>Gap:</strong> {g}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
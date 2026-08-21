import React, { useEffect, useState } from 'react'
import { BarChart3, Users, Award, ShieldAlert, BookOpen } from 'lucide-react'

interface AnalyticsData {
  summary: {
    total_sessions: number
    completed_reports: number
    total_messages: number
    avg_resolution_score: number
  }
  intent_distribution: Array<{ intent: string; count: number }>
  frustration_trend: Array<{ session_id: string; average_frustration: number; resolution_score: number }>
  top_escalation_triggers: string[]
  identified_knowledge_gaps: string[]
}

export default function AnalyticsDashboardPlaceholder() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/analytics/dashboard')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error('Error fetching analytics:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-0 h-full max-w-[1600px] mx-auto w-full pb-12">
      {/* Header Band */}
      <div className="shrink-0 rounded-2xl border border-[#16283c] bg-gradient-to-r from-[#0A1A2E] via-[#0E2740] to-[#0B2A37] p-5 md:p-6 mb-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C7D2E8] bg-gradient-to-r from-[#E9EDF6] to-[#E7F7EF] px-3.5 py-1 text-xs font-medium text-[#0E2B6C]">
          <BarChart3 className="w-3.5 h-3.5" /> Telemetry & Insights
        </div>
        <h1 className="mt-2.5 text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">
          Performance Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-[#9DB7CF]">
          Aggregated quality indicators, knowledge gap tracking, and escalation prevention telemetry across all sessions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0E2B6C]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Sessions</span>
                <Users className="w-4 h-4 text-[#0E2B6C]" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{data?.summary.total_sessions || 0}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Avg Resolution Score</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{data?.summary.avg_resolution_score || 0}%</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Completed Reports</span>
                <BarChart3 className="w-4 h-4 text-[#0E7490]" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{data?.summary.completed_reports || 0}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Turns Logged</span>
                <BookOpen className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">{data?.summary.total_messages || 0}</div>
            </div>
          </div>

          {/* Middle Row: Intent Frequency + Frustration Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Intent Distribution */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Top Classified Customer Intents</h3>
              {data?.intent_distribution && data.intent_distribution.length > 0 ? (
                <div className="space-y-4">
                  {data.intent_distribution.map((item, idx) => {
                    const maxCount = Math.max(...data.intent_distribution.map((d) => d.count), 1)
                    const percentage = Math.round((item.count / maxCount) * 100)
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                          <span>{item.intent}</span>
                          <span>{item.count} occurrences</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full brand-grad rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No intent metrics recorded yet.</p>
              )}
            </div>

            {/* Frustration vs Quality Trend */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Session Quality Trends</h3>
              {data?.frustration_trend && data.frustration_trend.length > 0 ? (
                <div className="space-y-3">
                  {data.frustration_trend.map((pt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className="text-xs font-semibold text-slate-700">Session {pt.session_id}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-amber-700">Frustration: <strong>{pt.average_frustration}/100</strong></span>
                        <span className="text-emerald-700">Resolution: <strong>{pt.resolution_score}/100</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Complete more sessions to populate quality trend telemetry.</p>
              )}
            </div>
          </div>

          {/* Bottom Row: Knowledge Gaps and Escalation Triggers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" /> Common Escalation Triggers
              </h3>
              {data?.top_escalation_triggers && data.top_escalation_triggers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.top_escalation_triggers.map((t, idx) => (
                    <span key={idx} className="text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg">
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No persistent escalation triggers flagged.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0E2B6C]" /> Identified Knowledge Base Gaps
              </h3>
              {data?.identified_knowledge_gaps && data.identified_knowledge_gaps.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.identified_knowledge_gaps.map((g, idx) => (
                    <span key={idx} className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg">
                      {g}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No knowledge gaps identified in customer queries.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import TopNav from './components/TopNav'
import SessionConfig from './pages/SessionConfig'
import KnowledgeBaseUpload from './pages/KnowledgeBaseUpload'

import LiveConsolePlaceholder from './pages/LiveConsolePlaceholder'
import CoachingFeedPlaceholder from './pages/CoachingFeedPlaceholder'
import EscalationAlertsPlaceholder from './pages/EscalationAlertsPlaceholder'
import ReportsPlaceholder from './pages/ReportsPlaceholder'
import AnalyticsDashboardPlaceholder from './pages/AnalyticsDashboardPlaceholder'

export default function App() {
  return (
    <div className="min-h-screen relative">
      <div className="app-bg" aria-hidden="true" />

      <TopNav />

      <div className="mx-auto max-w-4xl px-4 pt-6">
        <section className="glass rounded-3xl p-6 md:p-8 overflow-hidden fade-in-up">
          <div className="absolute inset-0 pointer-events-none opacity-70">
            <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />
            <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Ready
              </div>


              <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Clario - AI <span className="text-blue-700">Coaching</span> Assistant
              </h1>

              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-xl">
                Configure your session simulator or ingest your knowledge base to power faster, more accurate coaching.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-center">
                <div className="text-xs font-semibold text-slate-500">Modes</div>
                <div className="mt-1 text-lg font-bold text-slate-900">3</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-center">
                <div className="text-xs font-semibold text-slate-500">RAG</div>
                <div className="mt-1 text-lg font-bold text-slate-900">Upload</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-center">
                <div className="text-xs font-semibold text-slate-500">API</div>
                <div className="mt-1 text-lg font-bold text-slate-900">Ready</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-4xl p-4">

        <div className="py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/session" replace />} />
            <Route path="/session" element={<SessionConfig />} />
            <Route path="/knowledge" element={<KnowledgeBaseUpload />} />

            {/* Milestone 2/3/4 placeholders (scaffolding) */}
            <Route path="/console" element={<LiveConsolePlaceholder />} />
            <Route path="/coaching" element={<CoachingFeedPlaceholder />} />
            <Route path="/escalation" element={<EscalationAlertsPlaceholder />} />
            <Route path="/reports" element={<ReportsPlaceholder />} />
            <Route path="/analytics" element={<AnalyticsDashboardPlaceholder />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}




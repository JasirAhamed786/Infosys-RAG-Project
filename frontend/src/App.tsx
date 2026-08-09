import React from 'react'

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopNav from './components/TopNav'
import SessionConfig from './pages/SessionConfig'
import KnowledgeBaseUpload from './pages/KnowledgeBaseUpload'
import Home from './pages/Home'

import LiveConsole from './pages/LiveConsole'
import CoachingFeedPlaceholder from './pages/CoachingFeedPlaceholder'
import EscalationAlertsPlaceholder from './pages/EscalationAlertsPlaceholder'
import ReportsPlaceholder from './pages/ReportsPlaceholder'
import AnalyticsDashboardPlaceholder from './pages/AnalyticsDashboardPlaceholder'

import { SessionProvider } from './context/SessionContext'


export default function App() {
  const location = useLocation(); // 3. Hook to track current page

  return (
    <SessionProvider>
      <div className="min-h-screen relative">
        <div className="app-bg" aria-hidden="true" />

        <TopNav />

        <div className="mx-auto max-w-7xl px-4 md:px-8 pt-6">
          <section className="surface p-6 md:p-8 fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#667085]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0E2B6C]" />
                  System ready
                </div>
                <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-[#101828]">
                  Clario — AI <span className="text-[#0E2B6C]">Coaching</span> Assistant
                </h1>
                <p className="mt-2 text-sm md:text-base text-[#667085] max-w-xl">
                  Configure a session simulator or ingest a knowledge base to power faster, more accurate live coaching.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-3 text-center"><div className="text-xs font-medium text-[#667085]">Modes</div><div className="mt-1 text-lg font-semibold text-[#101828]">3</div></div>
                <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-3 text-center"><div className="text-xs font-medium text-[#667085]">RAG</div><div className="mt-1 text-lg font-semibold text-[#101828]">Upload</div></div>
                <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-3 text-center"><div className="text-xs font-medium text-[#667085]">API</div><div className="mt-1 text-lg font-semibold text-[#101828]">Ready</div></div>
              </div>
            </div>
          </section>
        </div>

        <main className="mx-auto max-w-7xl w-full px-4 md:px-8 pb-6 flex-1 min-h-0 flex flex-col">
          <div className="py-6 flex-1 min-h-0 flex flex-col">
            {/* 4. Animation Wrapper */}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Home />} />
                  <Route path="/session" element={<SessionConfig />} />

                  <Route path="/knowledge" element={<KnowledgeBaseUpload />} />
                  <Route path="/console" element={<LiveConsole />} />
                  <Route path="/coaching" element={<CoachingFeedPlaceholder />} />
                  <Route path="/escalation" element={<EscalationAlertsPlaceholder />} />
                  <Route path="/reports" element={<ReportsPlaceholder />} />
                  <Route path="/analytics" element={<AnalyticsDashboardPlaceholder />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}

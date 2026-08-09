import React from 'react'

import { Route, Routes, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
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
  const location = useLocation()

  return (
    <SessionProvider>
<div className="min-h-screen relative bg-transparent">
        <div className="app-bg" aria-hidden="true" />

        <div className="flex min-h-screen">
          {/* Sidebar (manages its own collapse state) */}
          <Sidebar />

{/* Main content — the "canvas" */}
          <main className="flex-1 min-w-0 mx-auto max-w-[1400px] w-full px-4 md:px-8 py-6 bg-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
              >
                <Routes location={location}>
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
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}

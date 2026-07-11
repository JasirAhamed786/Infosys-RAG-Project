import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import TopNav from './components/TopNav'
import SessionConfig from './pages/SessionConfig'
import KnowledgeBaseUpload from './pages/KnowledgeBaseUpload'

export default function App() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-3xl p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/session" replace />} />
          <Route path="/session" element={<SessionConfig />} />
          <Route path="/knowledge" element={<KnowledgeBaseUpload />} />
        </Routes>
      </main>
    </div>
  )
}


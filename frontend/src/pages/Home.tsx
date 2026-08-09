import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const STEPS: { icon: React.ReactNode; title: string; body: string; cta: string; to: string }[] = [
  {
    to: '/session',
    title: 'Configure',
    body: 'Set up a simulator, roleplay, or replay coaching environment tailored to your business context.',
    cta: 'Start setup',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/knowledge',
    title: 'Ingest Knowledge',
    body: 'Upload training documents and let RAG embed and index them for fast, accurate semantic retrieval.',
    cta: 'Upload docs',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    to: '/console',
    title: 'Coach Live',
    body: 'Launch the console and watch real-time telemetry, intent analysis, and coaching suggestions in action.',
    cta: 'Open console',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
    ),
  },
]

const FEATURES: { title: string; body: string; grad: string; icon: React.ReactNode }[] = [
  {
    title: 'Multi-Agent Pipeline',
    body: 'Intent, sentiment, knowledge retrieval, coaching, and escalation agents working in concert.',
    grad: 'panel-blue',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'RAG Retrieval',
    body: 'Semantic search over your knowledge base with transparent, source-linked reasoning.',
    grad: 'panel-teal',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: 'Live Telemetry',
    body: 'Real-time frustration tracking, satisfaction trends, and escalation risk scoring per turn.',
    grad: 'panel-green',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function Home() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
{/* Hero */}
<motion.section
        variants={item}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 brand-grad shimmer" aria-hidden="true" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
<div>
            <div className="flex items-center gap-3">
              <div className="brand-grad h-11 w-11 rounded-xl text-white flex items-center justify-center text-lg font-bold shadow-[0_4px_14px_rgba(14,116,144,0.35)]">
                C
              </div>
              <div className="leading-tight">
                <div className="font-display font-bold text-2xl md:text-3xl tracking-tight">
                  <span className="gradient-text">Clario</span>
                </div>
                <div className="text-xs font-medium text-[#667085]">AI Coaching Assistant</div>
              </div>
            </div>

            <h1 className="mt-6 text-3xl md:text-5xl font-display font-semibold tracking-tight text-[#101828] leading-tight">
              Coach support agents <span className="gradient-text">in real time</span>.
            </h1>
            <p className="mt-4 text-sm md:text-base text-[#667085] max-w-xl leading-relaxed">
              Clario combines RAG-powered knowledge retrieval with a multi-agent pipeline to deliver
              live intent analysis, sentiment tracking, and actionable coaching suggestions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <NavLink
                to="/console"
                className="inline-flex items-center gap-2 rounded-lg brand-grad px-6 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(14,116,144,0.3)] hover:opacity-95 transition-opacity"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Launch Live Console
              </NavLink>
              <NavLink
                to="/session"
                className="inline-flex items-center gap-2 rounded-lg border border-[#C7D2E8] bg-white px-6 py-3 text-sm font-medium text-[#0E2B6C] hover:bg-[#E9EDF6] transition-colors"
              >
                Configure Session
              </NavLink>
            </div>
          </div>

{/* Hero graphic — structured, spacious pipeline visual */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm overflow-hidden">
              <div className="absolute inset-0 brand-grad-soft glow-orb" aria-hidden="true" />

              {/* Center engine node */}
              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center brand-grad rounded-2xl text-white shadow-[0_12px_34px_rgba(14,116,144,0.4)] float-slow">
                <svg className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Capability modules — clean 2x2 grid */}
              <div className="relative grid grid-cols-2 gap-4">
                {[
                  { label: 'Intent', sub: 'Classification', grad: 'panel-blue', delay: 0 },
                  { label: 'Sentiment', sub: 'Trend analysis', grad: 'panel-teal', delay: 0.8 },
                  { label: 'Knowledge', sub: 'RAG retrieval', grad: 'panel-green', delay: 1.6 },
                  { label: 'Coaching', sub: 'Live suggestions', grad: 'panel-violet', delay: 2.4 },
                ].map((n, i) => (
                  <motion.div
                    key={n.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`${n.grad} rounded-xl px-4 py-3 cursor-default hover:shadow-lg transition-shadow`}
                  >
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.4, repeat: Infinity, delay: n.delay }}
                        className="h-2 w-2 rounded-full bg-[#0E2B6C]"
                      />
                      <span className="text-sm font-semibold text-[#0E2B6C]">{n.label}</span>
                    </div>
                    <div className="mt-1 pl-4 text-[11px] font-medium text-[#667085]">{n.sub}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

{/* How it works */}
<motion.section variants={item} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-display font-semibold tracking-tight text-[#101828]">How it works</h2>
            <p className="mt-1 text-sm text-[#667085]">Three simple steps from configuration to live coaching.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.to}
              variants={item}
              className="group relative rounded-[8px] border border-[#d7e3f4] bg-white p-6 hover-lift"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">Step {i + 1}</span>
                <div className="h-10 w-10 rounded-lg brand-grad-soft text-[#0E2B6C] flex items-center justify-center">
                  {s.icon}
                </div>
              </div>
              <h3 className="mt-4 text-base font-display font-semibold text-[#101828]">{s.title}</h3>
              <p className="mt-2 text-sm text-[#667085] leading-relaxed">{s.body}</p>
              <NavLink
                to={s.to}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0E2B6C] group-hover:gap-2.5 transition-all"
              >
                {s.cta} <span aria-hidden="true">→</span>
              </NavLink>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <motion.section variants={item}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={item} className={`${f.grad} p-6 hover-lift`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/80 text-[#0E2B6C] flex items-center justify-center shadow-sm">
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-[#101828]">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm text-[#344054] leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}

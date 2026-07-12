import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

// NOTE: this project uses a lightweight ambient type stub for react-router-dom.
// framer-motion is used purely for UI animation; any motion-* props are safe at runtime.

type BadgeTone = 'emerald' | 'blue' | 'slate'

type TelemetryMetric = {
  title: string
  subtitle: string
  badgeText: string
  tone: BadgeTone
}

const METRICS: TelemetryMetric[] = [
  {
    title: 'ChromaDB Connected',
    subtitle: 'Cosine Similarity Ready • Vector index healthy',
    badgeText: '100% Health',
    tone: 'emerald',
  },
  {
    title: 'Embeddings Pipeline',
    subtitle: 'Sub-millisecond readiness for new ingestion cycles',
    badgeText: 'Active • Low latency',
    tone: 'blue',
  },
  {
    title: 'Retrieval Accuracy',
    subtitle: '98.4% mock retrieval correctness across knowledge chunks',
    badgeText: '98.4% Score',
    tone: 'slate',
  },
]

function toneClasses(tone: BadgeTone): { pill: string; dot: string; bar: string; glow: string } {
  switch (tone) {
    case 'emerald':
      return {
        pill: 'bg-emerald-50/90 border-emerald-200 text-emerald-800',
        dot: 'bg-emerald-500',
        bar: 'from-emerald-500/60 to-emerald-600',
        glow: 'bg-emerald-500/10',
      }
    case 'blue':
      return {
        pill: 'bg-blue-50/90 border-blue-200 text-blue-800',
        dot: 'bg-blue-500',
        bar: 'from-blue-500/60 to-indigo-600',
        glow: 'bg-blue-500/10',
      }
    default:
      return {
        pill: 'bg-slate-50/90 border-slate-200 text-slate-800',
        dot: 'bg-slate-500',
        bar: 'from-slate-500/40 to-slate-700',
        glow: 'bg-slate-500/10',
      }
  }
}

function ProgressBar(props: { value: number; labelLeft: string; labelRight: string; tone: BadgeTone }) {
  const { value, labelLeft, labelRight, tone } = props
  const { dot, pill, bar } = toneClasses(tone)
  const v = Math.max(0, Math.min(100, value))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full ${dot} shadow-[0_0_24px_rgba(59,130,246,0.25)]`} />
          <span className="text-sm font-semibold text-slate-800 truncate">{labelLeft}</span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase ${pill}`}
        >
          {labelRight}
        </span>
      </div>

      <div className="relative h-2.5 rounded-full bg-slate-100/80 overflow-hidden border border-slate-200/70">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.55),transparent_55%)] opacity-60" />
      </div>
    </div>
  )
}

function AccuracyDial(props: { value: number }) {
  const { value } = props
  const radius = 34
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 via-slate-50 to-emerald-500/10 blur-xl" />
        <svg className="absolute inset-0 w-24 h-24" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#6366f1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            strokeWidth={stroke}
            stroke="#e2e8f0"
            fill="none"
            opacity="0.55"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            strokeWidth={stroke}
            stroke="url(#dialGrad)"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-extrabold text-slate-900 leading-none">{clamped.toFixed(1)}%</div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Accuracy</div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confidence band</div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              Stable
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={clamped}
              labelLeft="Top-k retrieval"
              labelRight={`${clamped.toFixed(1)}%`}
              tone="emerald"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="space-y-6">
      <motion.section
        className="glass rounded-3xl p-6 md:p-8 overflow-hidden relative"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute top-10 left-10 h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.35)]" />
          <div className="absolute top-24 right-20 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)]" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            System Status: Coaching Ready
          </div>

          <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Welcome to <span className="text-blue-700">Clario AI Command Center</span>
          </h1>

          <p className="mt-3 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
            This command center uses a decoupled RAG architecture plus multi-agent simulation to coach customer
            support agents in real time—turning knowledge retrieval and live telemetry into actionable guidance.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="text-xs font-semibold text-slate-500">Widescreen Ops</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Enterprise UI</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="text-xs font-semibold text-slate-500">Coaching Pipeline</div>
              <div className="mt-1 text-lg font-bold text-slate-900">RAG + Agents</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="text-xs font-semibold text-slate-500">Motion & Glass</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Subtle Animations</div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/50 backdrop-blur-md p-6 md:p-8 overflow-hidden relative">
        <div className="absolute -top-14 -right-14 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-14 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">Quick-Start Workflow</h2>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                Follow Milestone 1 to configure the environment, ingest knowledge with RAG, and activate the live
                coaching console.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              Milestone 1 • 3 Steps
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="group block"
            >
              <NavLink to="/session" className="block h-full">
                <div className="h-full rounded-3xl border border-slate-200 bg-white/70 p-5 overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow duration-200">
                  <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl opacity-90" />
                  <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl opacity-80" />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">
                        Step 1
                      </span>
                      <span className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 group-hover:bg-white">
                        Simulator • Manual • Replay
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-base md:text-lg font-extrabold text-slate-900">Configure Coaching Environment</div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Choose how sessions run: Simulator, Manual roleplay, or Replay mode—then generate a coaching
                        context for real-time guidance.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">Go to Session Setup</div>
                      <div className="inline-flex items-center gap-2 text-blue-700 font-bold text-sm">
                        Open <span aria-hidden="true">→</span>
                      </div>
                    </div>

                    <div className="mt-4 h-2 rounded-full bg-slate-100">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500/70 to-indigo-600/80"
                        initial={{ width: '10%' }}
                        whileHover={{ width: '100%' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </NavLink>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
              className="group block"
            >
              <NavLink to="/knowledge" className="block h-full">
                <div className="h-full rounded-3xl border border-slate-200 bg-white/70 p-5 overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow duration-200">
                  <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl opacity-90" />
                  <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl opacity-80" />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                        Step 2
                      </span>
                      <span className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 group-hover:bg-white">
                        PDF text • Chunking
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-base md:text-lg font-extrabold text-slate-900">Upload Knowledge Base</div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Ingest PDFs by chunking text, embedding with a compact model, and indexing via ChromaDB for fast
                        semantic retrieval.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">Go to RAG Ingestion</div>
                      <div className="inline-flex items-center gap-2 text-indigo-700 font-bold text-sm">
                        Open <span aria-hidden="true">→</span>
                      </div>
                    </div>

                    <div className="mt-4 h-2 rounded-full bg-slate-100">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500/70 to-emerald-600/80"
                        initial={{ width: '10%' }}
                        whileHover={{ width: '100%' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </NavLink>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
              className="group block"
            >
              <NavLink to="/console" className="block h-full">
                <div className="h-full rounded-3xl border border-slate-200 bg-white/70 p-5 overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow duration-200">
                  <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl opacity-90" />
                  <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl opacity-80" />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Step 3
                      </span>
                      <span className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 group-hover:bg-white">
                        Telemetry • Suggestions
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-base md:text-lg font-extrabold text-slate-900">Launch Console</div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Activate real-time agent telemetry and response suggestions—watch coaching decisions reflect in
                        live coaching outputs.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">Go to Live Coaching</div>
                      <div className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        Open <span aria-hidden="true">→</span>
                      </div>
                    </div>

                    <div className="mt-4 h-2 rounded-full bg-slate-100">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500/70 to-blue-600/80"
                        initial={{ width: '10%' }}
                        whileHover={{ width: '100%' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </NavLink>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/50 backdrop-blur-md p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">System Telemetry & KPIs</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Mock analytics designed to feel real: animated health bars, badges, and an accuracy dial for
              retrieval confidence.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            Live Simulation • Preview
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 overflow-hidden relative">
              <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{METRICS[0].title}</div>
                    <div className="mt-1 text-xs text-slate-600">{METRICS[0].subtitle}</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    100% Health
                  </span>
                </div>

                <div className="mt-4">
                  <ProgressBar value={100} labelLeft="Index readiness" labelRight="Healthy" tone="emerald" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Index metric</div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900">Cosine</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Collections</div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900">Active</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 overflow-hidden relative">
              <div className="absolute -top-16 -left-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{METRICS[1].title}</div>
                    <div className="mt-1 text-xs text-slate-600">{METRICS[1].subtitle}</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Active
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Latency</div>
                        <div className="mt-1 text-lg font-extrabold text-slate-900">0.7 ms</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Model</div>
                        <div className="mt-1 text-sm font-mono font-bold text-blue-700">384D MiniLM-L6-v2</div>
                      </div>
                    </div>
                  </div>

                  <ProgressBar value={98} labelLeft="Pipeline readiness" labelRight="Sub-ms" tone="blue" />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 p-2">
                    <svg className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-700">Embeddings Pipeline</div>
                    <div className="text-xs text-slate-500">Queue stable • Warm index cache</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 overflow-hidden relative">
            <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">{METRICS[2].title}</div>
                  <div className="mt-1 text-xs text-slate-600">{METRICS[2].subtitle}</div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
                  98.4%
                </span>
              </div>

              <div className="mt-4">
                <AccuracyDial value={98.4} />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/65 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">KPI Summary</div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    Retrieval Strong
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  Top-k results match expected intents with minimal drift.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/60 overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500/15 to-emerald-500/15 border border-slate-200 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900">Telemetry Stream</div>
                <div className="text-xs text-slate-500">Mock updates every ~2 seconds • UI scaffold</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Last sync</span>
              <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-mono font-semibold text-slate-900">
                now
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100">
            <motion.div
              className="h-1.5 bg-gradient-to-r from-blue-500/70 via-indigo-500/70 to-emerald-500/70"
              initial={{ x: '-40%' }}
              animate={{ x: '40%' }}
              transition={{ duration: 1.6, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}


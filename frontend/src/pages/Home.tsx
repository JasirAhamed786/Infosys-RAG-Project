import React from 'react'
import { NavLink } from 'react-router-dom'

type BadgeTone = 'success' | 'accent' | 'neutral'

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
    tone: 'success',
  },
  {
    title: 'Embeddings Pipeline',
    subtitle: 'Sub-millisecond readiness for new ingestion cycles',
    badgeText: 'Active • Low latency',
    tone: 'accent',
  },
  {
    title: 'Retrieval Accuracy',
    subtitle: '98.4% correct retrieval across knowledge chunks',
    badgeText: '98.4% Score',
    tone: 'neutral',
  },
]

function toneClasses(tone: BadgeTone): { pill: string; dot: string; bar: string } {
  switch (tone) {
    case 'success':
      return {
        pill: 'bg-[#E7F7EF] border-[#B7E8CF] text-[#0F6E44]',
        dot: 'bg-[#12B76A]',
        bar: 'bg-[#12B76A]',
      }
    case 'accent':
      return {
        pill: 'bg-[#E9EDF6] border-[#C7D2E8] text-[#0E2B6C]',
        dot: 'bg-[#0E2B6C]',
        bar: 'bg-[#0E2B6C]',
      }
    default:
      return {
        pill: 'bg-[#F2F4F7] border-[#E4E7EC] text-[#344054]',
        dot: 'bg-[#667085]',
        bar: 'bg-[#667085]',
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
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-sm font-medium text-[#101828] truncate">{labelLeft}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${pill}`}>
          {labelRight}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-[#F2F4F7] overflow-hidden border border-[#E4E7EC]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${bar}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  )
}

function AccuracyDial(props: { value: number }) {
  const { value } = props
  const radius = 34
  const stroke = 7
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="absolute inset-0 w-24 h-24" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            strokeWidth={stroke}
            stroke="#E4E7EC"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            strokeWidth={stroke}
            stroke="#0E2B6C"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold text-[#101828] leading-none">{clamped.toFixed(1)}%</div>
            <div className="text-[10px] font-medium tracking-wide uppercase text-[#667085]">Accuracy</div>
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-[8px] border border-[#E4E7EC] bg-white p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Confidence band</div>
          <span className="rounded-full bg-[#E7F7EF] border border-[#B7E8CF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6E44]">
            Stable
          </span>
        </div>
        <div className="mt-2.5">
          <ProgressBar
            value={clamped}
            labelLeft="Top-k retrieval"
            labelRight={`${clamped.toFixed(1)}%`}
            tone="success"
          />
        </div>
      </div>
    </div>
  )
}

const WORKFLOW: { to: string; step: string; tag: string; title: string; body: string; cta: string }[] = [
  {
    to: '/session',
    step: 'Step 1',
    tag: 'Simulator • Manual • Replay',
    title: 'Configure Coaching Environment',
    body: 'Choose how sessions run: Simulator, Manual roleplay, or Replay mode—then generate a coaching context for real-time guidance.',
    cta: 'Go to Session Setup',
  },
  {
    to: '/knowledge',
    step: 'Step 2',
    tag: 'PDF text • Chunking',
    title: 'Upload Knowledge Base',
    body: 'Ingest PDFs by chunking text, embedding with a compact model, and indexing via ChromaDB for fast semantic retrieval.',
    cta: 'Go to RAG Ingestion',
  },
  {
    to: '/console',
    step: 'Step 3',
    tag: 'Telemetry • Suggestions',
    title: 'Launch Console',
    body: 'Activate real-time agent telemetry and response suggestions—watch coaching decisions reflected in live output.',
    cta: 'Go to Live Coaching',
  },
]

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="surface p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C7D2E8] bg-[#E9EDF6] px-3.5 py-1.5 text-xs font-medium text-[#0E2B6C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0E2B6C]" />
          System Status: Coaching Ready
        </div>

        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-[#101828] leading-tight">
          Clario AI Command Center
        </h1>

        <p className="mt-3 text-sm md:text-base text-[#667085] max-w-2xl leading-relaxed">
          A decoupled RAG architecture with multi-agent simulation coaches customer support agents in real time,
          turning knowledge retrieval and live telemetry into actionable guidance.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Ops Architecture</div>
            <div className="mt-1 text-lg font-semibold text-[#101828]">RAG + Agents</div>
          </div>
          <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Coaching Pipeline</div>
            <div className="mt-1 text-lg font-semibold text-[#101828]">Live Telemetry</div>
          </div>
          <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-4">
            <div className="text-xs font-medium text-[#667085]">Design System</div>
            <div className="mt-1 text-lg font-semibold text-[#101828]">Enterprise Tokens</div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="surface p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-[#101828]">Quick-Start Workflow</h2>
            <p className="mt-2 text-sm text-[#667085] max-w-2xl">
              Configure the environment, ingest knowledge with RAG, and activate the live coaching console.
            </p>
          </div>
          <div className="rounded-[8px] border border-[#E4E7EC] bg-white px-4 py-2 text-xs font-medium text-[#667085]">
            Getting started • 3 steps
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {WORKFLOW.map((item) => (
            <NavLink key={item.to} to={item.to} className="block group">
              <div className="h-full rounded-[8px] border border-[#E4E7EC] bg-white p-5 flex flex-col transition-shadow duration-200 shadow-card group-hover:shadow-cardh">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-[#C7D2E8] bg-[#E9EDF6] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0E2B6C]">
                    {item.step}
                  </span>
                  <span className="rounded-full bg-[#F2F4F7] px-3 py-0.5 text-xs font-medium text-[#667085]">
                    {item.tag}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-[#101828]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#667085] leading-relaxed">{item.body}</p>

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-[#E4E7EC]">
                  <span className="text-xs font-medium text-[#667085]">{item.cta}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0E2B6C]">
                    Open <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Telemetry */}
      <section className="surface p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-[#101828]">System Telemetry & KPIs</h2>
            <p className="mt-2 text-sm text-[#667085] max-w-2xl">
              Health bars, badges, and a retrieval accuracy dial for the current pipeline state.
            </p>
          </div>
          <div className="rounded-[8px] border border-[#E4E7EC] bg-white px-4 py-2 text-xs font-medium text-[#667085]">
            Live Simulation • Preview
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#101828]">{METRICS[0].title}</div>
                  <div className="mt-0.5 text-xs text-[#667085]">{METRICS[0].subtitle}</div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${METRICS[0].tone === 'success' ? 'bg-[#E7F7EF] border-[#B7E8CF] text-[#0F6E44]' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
                  {METRICS[0].badgeText}
                </span>
              </div>

              <div className="mt-4">
                <ProgressBar value={100} labelLeft="Index readiness" labelRight="Healthy" tone="success" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-[#667085]">Index Metric</div>
                  <div className="mt-1 text-lg font-semibold text-[#101828]">Cosine</div>
                </div>
                <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-[#667085]">Collections</div>
                  <div className="mt-1 text-lg font-semibold text-[#101828]">Active</div>
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#101828]">{METRICS[1].title}</div>
                  <div className="mt-0.5 text-xs text-[#667085]">{METRICS[1].subtitle}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7D2E8] bg-[#E9EDF6] px-2.5 py-0.5 text-[11px] font-semibold text-[#0E2B6C]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0E2B6C]" />
                  Active
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wider text-[#667085]">Latency</div>
                      <div className="mt-1 text-lg font-semibold text-[#101828]">0.7 ms</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-[#667085]">Model</div>
                      <div className="mt-1 text-sm font-mono font-semibold text-[#0E2B6C]">384D MiniLM-L6-v2</div>
                    </div>
                  </div>
                </div>

                <ProgressBar value={98} labelLeft="Pipeline readiness" labelRight="Sub-ms" tone="accent" />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-[8px] bg-[#F2F4F7] border border-[#E4E7EC] p-2">
                  <svg className="h-4 w-4 text-[#0E2B6C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#101828]">Embeddings Pipeline</div>
                  <div className="text-xs text-[#667085]">Queue stable • Warm index cache</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] border border-[#E4E7EC] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#101828]">{METRICS[2].title}</div>
                <div className="mt-0.5 text-xs text-[#667085]">{METRICS[2].subtitle}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7EC] bg-[#F2F4F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#344054]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#667085]" />
                {METRICS[2].badgeText}
              </span>
            </div>

            <div className="mt-4">
              <AccuracyDial value={98.4} />
            </div>

            <div className="mt-4 rounded-[8px] border border-[#E4E7EC] bg-white p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#667085]">KPI Summary</div>
                <span className="rounded-full bg-[#E7F7EF] border border-[#B7E8CF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6E44]">
                  Retrieval Strong
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-[#101828]">
                Top-k results match expected intents with minimal drift.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[8px] border border-[#E4E7EC] bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-10 w-10 rounded-[8px] bg-[#E9EDF6] border border-[#C7D2E8] flex items-center justify-center">
                <svg className="h-5 w-5 text-[#0E2B6C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#101828]">Telemetry Stream</div>
                <div className="text-xs text-[#667085]">Live updates reflecting pipeline activity</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#667085]">Last sync</span>
              <span className="rounded-full border border-[#E4E7EC] bg-white px-3 py-1 text-xs font-mono font-medium text-[#101828]">
                now
              </span>
            </div>
          </div>
          <div className="h-1 bg-[#F2F4F7]">
            <div className="h-1 bg-[#0E2B6C] w-1/2" />
          </div>
        </div>
      </section>
    </div>
  )
}


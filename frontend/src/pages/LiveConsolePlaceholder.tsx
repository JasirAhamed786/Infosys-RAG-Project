import React, { useEffect, useState } from 'react'
import ComingSoonBase from './ComingSoonBase'

type Turn = {
  customer_message: string
  coaching: { coaching_tips: { tip: string; severity: string }[]; suggested_response: string }
  escalation: { risk: string; score: number }
}

export default function LiveConsolePlaceholder() {
  const [loading, setLoading] = useState(true)
  const [mockTurn, setMockTurn] = useState<Turn | null>(null)

  useEffect(() => {
    // Mock wiring: try to call backend turn endpoint; if unavailable, fall back to inline mock.
    async function run() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/conversation/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'mock-session-id',
            mode: 'Simulator',
            product_context: 'Retail Banking Support',
            scenario: 'Customer disputes recurring late fee',
            persona: null,
            user_message: 'I keep getting charged a late fee even when I pay on time. Why?',
            turn_index: 0,
          }),
        })

        if (!res.ok) throw new Error('Backend not reachable')
        const data = await res.json()

        setMockTurn({
          customer_message: data.customer_simulation.customer_message,
          coaching: {
            coaching_tips: (data.coaching.coaching_tips ?? []).map((t: string) => ({ tip: t, severity: 'normal' })),
            suggested_response: data.coaching.suggested_response,
          },
          escalation: {
            risk: data.escalation.risk,
            score: data.escalation.score,
          },
        })
      } catch {
        setMockTurn({
          customer_message:
            'I’ve been charged a late fee again even though I paid on time. Can you check why it keeps happening?',
          coaching: {
            coaching_tips: [
              { tip: 'Acknowledge frustration and confirm timeline.', severity: 'normal' },
              { tip: 'Ask one clarifying question about payment setup changes.', severity: 'normal' },
            ],
            suggested_response:
              "I’m sorry this keeps happening. Let's verify the posting details and payment context so we can correct the issue. Could you share the date you noticed the late fee?",
          },
          escalation: { risk: 'medium', score: 0.62 },
        })
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  return (
    <ComingSoonBase
      title="Live Support Console"
      description="Three-panel coaching interface (Simulator / Manual / Replay)."
      milestone="Milestone 3"
      badgeColor="emerald"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Conversation */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-sm font-semibold text-gray-900">Conversation</div>
          <div className="mt-3 space-y-3">
            {/* Skeleton */}
            {loading && (
              <>
                <div className="h-10 rounded-xl bg-white border border-slate-200 animate-pulse" />
                <div className="h-10 rounded-xl bg-white border border-slate-200 animate-pulse" />
              </>
            )}
            {!loading && mockTurn && (
              <>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer</div>
                  <div className="mt-1 text-sm text-slate-900">{mockTurn.customer_message}</div>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Agent Draft</div>
                  <div className="mt-1 text-sm text-slate-900">{mockTurn.coaching.suggested_response}</div>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">(UI scaffold only)</div>
        </div>

        {/* Middle: Coaching Tips */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white/60 p-4">
          <div className="text-sm font-semibold text-gray-900">Coaching Feed</div>
          <div className="mt-3 space-y-3">
            {loading && (
              <>
                <div className="h-16 rounded-xl bg-slate-50 border border-slate-200 animate-pulse" />
                <div className="h-16 rounded-xl bg-slate-50 border border-slate-200 animate-pulse" />
              </>
            )}
            {!loading && mockTurn && (
              <>
                {mockTurn.coaching.coaching_tips.map((t, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tip {idx + 1}</div>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                        {t.severity}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-900">{t.tip}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right: Escalation */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white/60 p-4">
          <div className="text-sm font-semibold text-gray-900">Escalation Alerts</div>
          <div className="mt-4">
            {loading ? (
              <div className="h-24 rounded-xl bg-slate-50 border border-slate-200 animate-pulse" />
            ) : (
              mockTurn && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Risk</span>
                    <span
                      className={
                        mockTurn.escalation.risk === 'high'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : mockTurn.escalation.risk === 'medium'
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      + ' text-[10px] font-semibold px-2 py-1 rounded-full border'
                      }
                    >
                      {mockTurn.escalation.risk}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-900">
                    Score: {(mockTurn.escalation.score * 100).toFixed(0)}%
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Alerting logic will be implemented in Milestone 3.
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </ComingSoonBase>
  )
}


import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSession,
  startSimulator,
  simulatorTurn,
  getSimulatorStreamUrl,
  type CreateSessionModeBackend,
} from '../services/api'

// ─── Types ────────────────────────────────────────────────────────
type Message = {
  role: 'customer' | 'agent' | 'system'
  content: string
  turnIndex: number
  intentSentiment?: {
    intent: string
    emotion: string
    frustration_score: number
    satisfaction_trend: string
  } | null
  knowledge?: {
    results: {
      chunk_text: string
      source_document: string
      relevance_score: number
      why_relevant: string
    }[]
    note?: string
  } | null
  frustrationLevel?: number | null
}

type SessionInfo = {
  sessionId: string
  threadId: string
  mode: CreateSessionModeBackend
  productContext: string
  scenario: string
  persona: string | null
}

// ─── Emotion Color Map ────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  angry: 'bg-red-100 border-red-300 text-red-800',
  frustrated: 'bg-orange-100 border-orange-300 text-orange-800',
  anxious: 'bg-amber-100 border-amber-300 text-amber-800',
  confused: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  disappointed: 'bg-rose-100 border-rose-300 text-rose-800',
  neutral: 'bg-slate-100 border-slate-300 text-slate-700',
  calm: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  satisfied: 'bg-green-100 border-green-300 text-green-800',
  urgent: 'bg-purple-100 border-purple-300 text-purple-800',
}

const TREND_ICONS: Record<string, string> = {
  improving: '📈',
  declining: '📉',
  stable: '➡️',
  baseline: '🆕',
}

// ─── Main Component ───────────────────────────────────────────────
export default function LiveConsole() {
  // Session configuration
  const [session, setSession] = useState<SessionInfo | null>(null)

  // Simulator mode selection
  const [mode, setMode] = useState<CreateSessionModeBackend>('Simulator')
  const [productContext, setProductContext] = useState('')
  const [scenario, setScenario] = useState('')
  const [persona, setPersona] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([])
  const [agentInput, setAgentInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Latest analysis results
  const [latestIntent, setLatestIntent] = useState<Message['intentSentiment']>(null)
  const [latestKnowledge, setLatestKnowledge] = useState<Message['knowledge']>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // ─── Start Session ────────────────────────────────────────────
  async function handleStartSession(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const sessionPayload = {
        mode,
        product_context: productContext,
        scenario,
        persona: persona.trim() || null,
      }
      const sessionResult = await createSession(sessionPayload)
      const sessionId = sessionResult.session_id

      const simResult = await startSimulator({
        session_id: sessionId,
        mode,
        product_context: productContext,
        scenario,
        persona: persona.trim() || null,
      })

      setSession({
        sessionId: simResult.session_id,
        threadId: simResult.thread_id,
        mode,
        productContext,
        scenario,
        persona: persona.trim() || null,
      })

      const firstMsg = simResult.messages[0]
      if (firstMsg) {
        setMessages([{
          role: 'customer',
          content: firstMsg.content,
          turnIndex: firstMsg.turn_index,
        }])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start simulator'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Send Agent Message ───────────────────────────────────────
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!agentInput.trim() || !session || sending) return

    const currentTurn = messages.length
    const agentMsg = agentInput.trim()

    setMessages(prev => [...prev, {
      role: 'agent',
      content: agentMsg,
      turnIndex: currentTurn,
    }])
    setAgentInput('')
    setSending(true)
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      const streamUrl = getSimulatorStreamUrl(
        session.sessionId,
        agentMsg,
        currentTurn,
      )

      const eventSource = new EventSource(streamUrl)
      eventSourceRef.current = eventSource
      let fullMessage = ''

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close()
          eventSourceRef.current = null
          finishTurn(agentMsg, currentTurn, fullMessage)
          return
        }
        fullMessage += event.data
        setStreamingMessage(fullMessage)
      }

      eventSource.onerror = () => {
        eventSource.close()
        eventSourceRef.current = null
        fallbackTurn(agentMsg, currentTurn)
      }
    } catch {
      fallbackTurn(agentMsg, currentTurn)
    }
  }

  // ─── Finish Turn (after streaming) ────────────────────────────
  async function finishTurn(agentMsg: string, turnIndex: number, streamedMessage: string) {
    setStreamingMessage('')
    setIsStreaming(false)

    setMessages(prev => [...prev, {
      role: 'customer',
      content: streamedMessage,
      turnIndex: turnIndex + 1,
    }])

    try {
      const turnResult = await simulatorTurn({
        session_id: session!.sessionId,
        thread_id: session!.threadId,
        user_message: agentMsg,
        turn_index: turnIndex,
      })

      setLatestIntent(turnResult.intent_sentiment)
      setLatestKnowledge(turnResult.knowledge)

      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'customer') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            intentSentiment: turnResult.intent_sentiment,
            knowledge: turnResult.knowledge,
            frustrationLevel: turnResult.frustration_level,
          }
        }
        return updated
      })
    } catch (err) {
      console.error('Failed to get turn analysis:', err)
    }

    setSending(false)
  }

  // ─── Fallback Turn (no streaming) ─────────────────────────────
  async function fallbackTurn(agentMsg: string, turnIndex: number) {
    setIsStreaming(false)
    setStreamingMessage('')

    try {
      const turnResult = await simulatorTurn({
        session_id: session!.sessionId,
        thread_id: session!.threadId,
        user_message: agentMsg,
        turn_index: turnIndex,
      })

      setLatestIntent(turnResult.intent_sentiment)
      setLatestKnowledge(turnResult.knowledge)

      setMessages(prev => [...prev, {
        role: 'customer',
        content: turnResult.customer_message,
        turnIndex: turnResult.turn_index,
        intentSentiment: turnResult.intent_sentiment,
        knowledge: turnResult.knowledge,
        frustrationLevel: turnResult.frustration_level,
      }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get response'
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${msg}`,
        turnIndex: turnIndex + 1,
      }])
    }

    setSending(false)
  }

  // ─── Reset ────────────────────────────────────────────────────
  function handleReset() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setSession(null)
    setMessages([])
    setStreamingMessage('')
    setIsStreaming(false)
    setSending(false)
    setLatestIntent(null)
    setLatestKnowledge(null)
    setAgentInput('')
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* ── Header Banner ── */}
      <div className="shrink-0 bg-white border border-gray-200 rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-sm mb-4">
        <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              <span className={`h-2 w-2 rounded-full ${session ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {session ? 'Session Active' : 'Configure Session'}
            </div>
            <h1 className="mt-2.5 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Live <span className="text-emerald-600">Support</span> Console
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              {session
                ? `Simulator Mode Active • Session: ${session.sessionId.slice(0, 8)}... • Thread: ${session.threadId.slice(0, 8)}...`
                : 'Configure a session below to start simulating real customer support interactions and testing AI assistance.'}
            </p>
          </div>
          {session && (
            <button
              onClick={handleReset}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Session
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Session Config (shown when no session) ── */}
      {!session && (
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 max-w-2xl mx-auto w-full">
          <form onSubmit={handleStartSession} className="space-y-5">
            <div className="space-y-4">
              {/* Mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Conversation Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as CreateSessionModeBackend)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={loading}
                >
                  <option value="Simulator">Simulator — AI-Generated Customer</option>
                  <option value="Manual">Manual — You Play Both Roles</option>
                  <option value="Replay">Replay — Review Past Sessions</option>
                </select>
              </div>

              {/* Product Context */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Product / Service Context <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productContext}
                  onChange={(e) => setProductContext(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Retail Banking & Credit Card Support"
                  required
                  disabled={loading}
                />
              </div>

              {/* Persona */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Persona <span className="text-xs font-normal text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Frustrated Customer demanding immediate resolution"
                  disabled={loading}
                />
              </div>

              {/* Scenario */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Scenario <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm min-h-[100px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
                  placeholder="Describe the customer's specific situation, problem statement, or goal..."
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Initializing Simulation Environment...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Simulation
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
              <div className="shrink-0 text-rose-500 mt-0.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-900">Initialization Error</h4>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Live Console Workspace (shown when session is active) ── */}
      {session && (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* Real-time Analysis Summary Bar */}
          {latestIntent && (
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-gray-200 px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${EMOTION_COLORS[latestIntent?.emotion || 'neutral'] || 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {latestIntent?.emotion || 'neutral'}
                </span>
                <span className="text-sm text-slate-600">
                  Intent: <span className="text-indigo-600 font-semibold capitalize">{latestIntent?.intent?.replace(/_/g, ' ') || 'General Question'}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>
                  Frustration: <span className={(latestIntent?.frustration_score || 0) > 60 ? 'text-red-600 font-bold' : 'text-slate-900 font-semibold'}>{latestIntent?.frustration_score || 0}/100</span>
                </span>
                <span className="flex items-center gap-1">
                  {TREND_ICONS[latestIntent?.satisfaction_trend || 'stable']} <span className="capitalize font-medium">{latestIntent?.satisfaction_trend || 'stable'}</span>
                </span>
              </div>
            </div>
          )}

          {/* ── Chat Card ── */}
          <div className="shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 flex items-center justify-between bg-gray-50/40">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Active Conversation</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Turn {messages.filter(m => m.role !== 'system').length} • Thread ID: {session.threadId.slice(0, 8)}...
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isStreaming && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Streaming
                  </span>
                )}
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {session.mode}
                </span>
              </div>
            </div>

            {/* Scrollable Messages */}
            <div className="h-[400px] overflow-y-auto px-5 py-4 space-y-3.5 bg-slate-50/20">
              {messages.length === 0 && !streamingMessage && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm font-medium text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400 mt-1">Type a response below to start the conversation.</p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'customer' ? 'justify-start' : msg.role === 'agent' ? 'justify-end' : 'justify-center'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm ${
                    msg.role === 'customer'
                      ? 'bg-white border border-slate-200 text-slate-900'
                      : msg.role === 'agent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        msg.role === 'customer' ? 'text-slate-500' : msg.role === 'agent' ? 'text-emerald-100' : 'text-amber-600'
                      }`}>
                        {msg.role === 'customer' ? 'Customer' : msg.role === 'agent' ? 'You (Agent)' : 'System'}
                      </span>
                      {msg.frustrationLevel !== undefined && msg.frustrationLevel !== null && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          msg.frustrationLevel > 60 ? 'bg-red-100 text-red-800' :
                          msg.frustrationLevel > 35 ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          😤 {msg.frustrationLevel}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${msg.role === 'agent' ? 'text-white' : 'text-gray-900'}`}>
                      {msg.content}
                    </p>

                    {msg.intentSentiment && (
                      <div className={`mt-2 pt-2 border-t flex items-center gap-2.5 flex-wrap text-[11px] ${msg.role === 'agent' ? 'border-emerald-500/50 text-emerald-100' : 'border-slate-100 text-slate-500'}`}>
                        <span className="capitalize font-medium">
                          🎯 {msg.intentSentiment?.intent?.replace(/_/g, ' ') || 'General Question'}
                        </span>
                        <span className="capitalize font-medium">
                          😶 {msg.intentSentiment?.emotion || 'Neutral'} ({msg.intentSentiment?.frustration_score || 0})
                        </span>
                        <span className="capitalize font-medium">
                          {TREND_ICONS[msg.intentSentiment?.satisfaction_trend || 'stable']} {msg.intentSentiment?.satisfaction_trend || 'Stable'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl bg-white border border-emerald-200 p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Customer (Typing)</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {streamingMessage}
                      <span className="inline-block w-1 h-4 bg-emerald-500 ml-0.5 animate-pulse align-middle" />
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Agent Input Bar */}
            <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2.5">
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  placeholder="Type your response as the support agent..."
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={sending || isStreaming}
                />
                <button
                  type="submit"
                  disabled={!agentInput.trim() || sending || isStreaming}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sending ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ── Knowledge & Analytics Section (below chat) ── */}
          <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Intent & Sentiment Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2.5 mb-3.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Intent & Sentiment
              </h3>
              {latestIntent ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Intent</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                      {latestIntent?.intent?.replace(/_/g, ' ') || 'General Question'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Emotion</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        EMOTION_COLORS[latestIntent?.emotion || 'neutral'] || 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {latestIntent?.emotion || 'Neutral'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Frustration</div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                        <span>0</span>
                        <span className="font-bold text-slate-900">{latestIntent?.frustration_score || 0} / 100</span>
                        <span>100</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (latestIntent?.frustration_score || 0) > 60 ? 'bg-red-500' :
                            (latestIntent?.frustration_score || 0) > 35 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${latestIntent?.frustration_score || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trend</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg">{TREND_ICONS[latestIntent?.satisfaction_trend || 'stable'] || '➡️'}</span>
                      <span className="text-sm font-semibold text-gray-900 capitalize">{latestIntent?.satisfaction_trend || 'Stable'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-center">
                  <p className="text-xs text-slate-500">Awaiting first turn...</p>
                </div>
              )}
            </div>

            {/* Knowledge Base Results Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col">
              <h3 className="shrink-0 font-bold text-gray-900 text-sm border-b border-gray-100 pb-2.5 mb-3.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Knowledge Base
              </h3>
              {latestKnowledge ? (
                latestKnowledge?.results?.length > 0 ? (
                  <div className="space-y-2.5 overflow-y-auto max-h-[240px] pr-0.5">
                    {latestKnowledge.results.map((result, idx) => (
                      <div key={idx} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 transition-all hover:bg-indigo-50/70">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                            {((result?.relevance_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-900 leading-relaxed line-clamp-2 mb-1 font-medium">
                          {result?.chunk_text}
                        </p>
                        <div className="text-[10px] text-gray-500 truncate">
                          📄 {result?.source_document}
                        </div>
                        {result?.why_relevant && (
                          <div className="mt-1.5 pt-1.5 border-t border-indigo-200/60">
                            <p className="text-[10px] text-gray-600 leading-relaxed">{result.why_relevant}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-center">
                    <p className="text-xs text-slate-500">
                      {latestKnowledge?.note === 'no relevant knowledge found'
                        ? 'No relevant knowledge found.'
                        : 'No results available.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-center">
                  <p className="text-xs text-slate-500">Knowledge results appear here...</p>
                </div>
              )}
            </div>

            {/* Coaching Tips Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2.5 mb-3.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Coaching Tips
              </h3>
              <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-4 text-center">
                <p className="text-xs text-amber-800 font-medium">
                  ⏳ AI coaching recommendations coming in Milestone 3.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

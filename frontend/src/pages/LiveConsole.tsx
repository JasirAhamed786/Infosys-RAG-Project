import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSession,
  startSimulator,
  simulatorTurn,
  getSimulatorStreamUrl,
  type CreateSessionModeBackend,
  type SimulatorTurnResponse,
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
      // Step 1: Create a session via the sessions API
      const sessionPayload = {
        mode,
        product_context: productContext,
        scenario,
        persona: persona.trim() || null,
      }
      const sessionResult = await createSession(sessionPayload)
      const sessionId = sessionResult.session_id

      // Step 2: Start the simulator with the created session
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

      // Add the first customer message
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

    // Add agent message to chat
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
      // First try streaming
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

          // Now get the full analysis from the turn endpoint
          finishTurn(agentMsg, currentTurn, fullMessage)
          return
        }
        fullMessage += event.data
        setStreamingMessage(fullMessage)
      }

      eventSource.onerror = () => {
        eventSource.close()
        eventSourceRef.current = null

        // If streaming failed, fall back to the message endpoint
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

    // Add the streamed customer message
    setMessages(prev => [...prev, {
      role: 'customer',
      content: streamedMessage,
      turnIndex: turnIndex + 1,
    }])

    // Get analysis from the turn endpoint
    try {
      const turnResult = await simulatorTurn({
        session_id: session!.sessionId,
        thread_id: session!.threadId,
        user_message: agentMsg,
        turn_index: turnIndex,
      })

      setLatestIntent(turnResult.intent_sentiment)
      setLatestKnowledge(turnResult.knowledge)

      // Update the last customer message with analysis
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
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/60 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <span className={`h-2 w-2 rounded-full ${session ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'} `} />
                {session ? 'Session Active' : 'Configure Session'}
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Live <span className="text-emerald-700">Support</span> Console
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-xl">
                {session
                  ? `Simulator Mode • Session: ${session.sessionId.slice(0, 8)}...`
                  : 'Configure a session below to start simulating real customer interactions.'}
              </p>
            </div>
            {session && (
              <button
                onClick={handleReset}
                className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session Config (shown when no session) */}
      {!session && (
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <form onSubmit={handleStartSession} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Mode */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Conversation Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as CreateSessionModeBackend)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={loading}
                >
                  <option value="Simulator">Simulator (AI-Generated Customer)</option>
                  <option value="Manual">Manual (You Play Both Roles)</option>
                  <option value="Replay">Replay (Review Past Sessions)</option>
                </select>
              </div>

              {/* Product Context */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Product / Service Context <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productContext}
                  onChange={(e) => setProductContext(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Retail Banking Support"
                  required
                  disabled={loading}
                />
              </div>

              {/* Persona */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Persona <span className="text-xs font-normal text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Frustrated Customer"
                  disabled={loading}
                />
              </div>

              {/* Scenario */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Scenario <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm min-h-[100px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
                  placeholder="Describe the customer's situation..."
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Starting Simulator...
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

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
              <div className="shrink-0 text-rose-500 mt-0.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-900">Error</h4>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Live Console (shown when session is active) */}
      {session && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Conversation */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Analysis Bar (Repaired missing HTML) */}
            {latestIntent && (
              <div className="flex flex-wrap items-center gap-4 rounded-full bg-white border border-gray-200 px-5 py-2.5 shadow-sm">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${EMOTION_COLORS[latestIntent?.emotion || 'neutral'] || 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {latestIntent?.emotion || 'neutral'}
                </span>
                <span className="text-sm font-medium text-slate-600">
                  Intent: <span className="text-indigo-600 font-semibold capitalize">{latestIntent?.intent?.replace(/_/g, ' ') || 'General Question'}</span>
                </span>
                <span className="text-sm font-medium text-slate-600">
                  Frustration: <span className={(latestIntent?.frustration_score || 0) > 60 ? 'text-red-600 font-bold' : 'text-slate-900'}>{latestIntent?.frustration_score || 0}/100</span>
                </span>
                <span className="text-sm font-medium text-slate-600 flex items-center gap-1 capitalize">
                  {TREND_ICONS[latestIntent?.satisfaction_trend || 'stable']} {latestIntent?.satisfaction_trend || 'stable'}
                </span>
              </div>
            )}

            {/* Conversation Panel */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Conversation</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Turn {messages.filter(m => m.role !== 'system').length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isStreaming && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Streaming
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {session.mode}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[400px] overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'customer' ? 'justify-start' : msg.role === 'agent' ? 'justify-end' : 'justify-center'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.role === 'customer'
                        ? 'bg-slate-50 border border-slate-200'
                        : msg.role === 'agent'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          msg.role === 'customer' ? 'text-slate-500' : msg.role === 'agent' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {msg.role === 'customer' ? 'Customer' : msg.role === 'agent' ? 'You (Agent)' : 'System'}
                        </span>
                        {msg.frustrationLevel !== undefined && msg.frustrationLevel !== null && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            msg.frustrationLevel > 60 ? 'bg-red-50 text-red-700' :
                            msg.frustrationLevel > 35 ? 'bg-amber-50 text-amber-700' :
                            'bg-emerald-50 text-emerald-700'
                          }`}>
                            😤 {msg.frustrationLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 leading-relaxed">{msg.content}</p>

                      {/* Intent/Sentiment badge on message */}
                      {msg.intentSentiment && (
                        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-500 capitalize">
                            🎯 {msg.intentSentiment?.intent?.replace(/_/g, ' ') || 'General Question'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 capitalize">
                            😶 {msg.intentSentiment?.emotion || 'Neutral'} ({msg.intentSentiment?.frustration_score || 0})
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 capitalize">
                            {TREND_ICONS[msg.intentSentiment?.satisfaction_trend || 'stable']} {msg.intentSentiment?.satisfaction_trend || 'Stable'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl bg-emerald-50/50 border border-emerald-200/70 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Customer</span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {streamingMessage}
                        <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-0.5 animate-pulse" />
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Agent Input */}
              <div className="border-t border-gray-100 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Type your response as the support agent..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    disabled={sending || isStreaming}
                  />
                  <button
                    type="submit"
                    disabled={!agentInput.trim() || sending || isStreaming}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {sending ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Panel: Knowledge & Analytics */}
          <div className="space-y-4">
            {/* Intent & Sentiment Detail */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Intent & Sentiment</h3>
              {latestIntent ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Intent</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                      {latestIntent?.intent?.replace(/_/g, ' ') || 'General Question'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Emotion</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                        EMOTION_COLORS[latestIntent?.emotion || 'neutral'] || 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {latestIntent?.emotion || 'Neutral'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Frustration Score</div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>0</span>
                        <span className="font-semibold">{latestIntent?.frustration_score || 0}</span>
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
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Satisfaction Trend</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg">{TREND_ICONS[latestIntent?.satisfaction_trend || 'stable'] || '➡️'}</span>
                      <span className="text-sm font-semibold text-gray-900 capitalize">{latestIntent?.satisfaction_trend || 'Stable'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500">Waiting for first message...</p>
                </div>
              )}
            </div>

            {/* Knowledge Panel */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Knowledge Base Results</h3>
              {latestKnowledge ? (
                latestKnowledge?.results?.length > 0 ? (
                  <div className="space-y-3">
                    {latestKnowledge.results.map((result, idx) => (
                      <div key={idx} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {((result?.relevance_score || 0) * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <div className="text-xs text-gray-900 leading-relaxed line-clamp-3 mb-2">
                          {result?.chunk_text}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-500 truncate">
                            📄 {result?.source_document}
                          </span>
                        </div>
                        {result?.why_relevant && (
                          <div className="mt-2 pt-2 border-t border-indigo-200/50">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">
                              Why relevant
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{result.why_relevant}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                    <p className="text-xs text-slate-500">
                      {latestKnowledge?.note === 'no relevant knowledge found'
                        ? 'No relevant knowledge found for this query.'
                        : 'No knowledge results available.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                  <p className="text-xs text-slate-500">Knowledge results appear here...</p>
                </div>
              )}
            </div>

            {/* Coaching Tips (placeholder) */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Coaching Tips</h3>
              <div className="rounded-xl bg-amber-50/50 border border-amber-200 p-4 text-center">
                <p className="text-xs text-amber-700">
                  ⏳ Coaching tips coming in Milestone 3.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
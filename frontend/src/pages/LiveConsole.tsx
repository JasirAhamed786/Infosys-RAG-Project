import React, { useEffect, useRef, useState } from 'react'
import {
  type CreateSessionModeBackend,
} from '../services/api'
import { useSession, type ChatMessage } from '../context/SessionContext'

// ─── Emotion Color Map ────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  angry: 'bg-red-50 border-red-200 text-red-700',
  frustrated: 'bg-orange-50 border-orange-200 text-orange-700',
  anxious: 'bg-amber-50 border-amber-200 text-amber-700',
  confused: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  disappointed: 'bg-rose-50 border-rose-200 text-rose-700',
  neutral: 'bg-slate-50 border-slate-200 text-slate-700',
  calm: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  satisfied: 'bg-green-50 border-green-200 text-green-700',
  urgent: 'bg-purple-50 border-purple-200 text-purple-700',
}

const TREND_ICONS: Record<string, string> = {
  improving: '📈',
  declining: '📉',
  stable: '➡️',
  baseline: '🆕',
}

// ─── Main Component ───────────────────────────────────────────────
export default function LiveConsole() {
  const {
    isSessionActive,
    sessionId,
    threadId,
    messages,
    latestIntentSentiment,
    latestKnowledgeResults,
    latestCoachingSuggestion,
    turnStatus,
    startSession,
    submitTurn,
    endSession,
    loadExistingSession,
  } = useSession()

  // ── Page-local UI state (NOT part of session data) ──
  // Session creation mode: 'new' or 'existing'
  const [sessionMode, setSessionMode] = useState<'new' | 'existing'>('new')

  // Simulator mode selection (new-session form)
  const [mode, setMode] = useState<CreateSessionModeBackend>('Simulator')
  const [productContext, setProductContext] = useState('')
  const [scenario, setScenario] = useState('')
  const [persona, setPersona] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Existing session loading
  const [existingSessionId, setExistingSessionId] = useState('')

  // Reply input box (page-local, deliberately not in context)
  const [agentInput, setAgentInput] = useState('')

  // Client-side typewriter over the complete customer message (not backend streaming)
  const typingRef = useRef<number | null>(null)
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Auto-Scroll ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isTyping ? 'auto' : 'smooth',
    })
  }, [messages, typingText, isTyping])

  // ─── Typewriter effect: reveal the latest customer message word-by-word ──
  // Pure frontend visual; no backend calls. Runs after the last customer
  // message lands in context (from submitTurn's single conversationTurn call).
  useEffect(() => {
    if (isTyping) return // already animating

    const lastCustomer = [...messages].reverse().find((m) => m.role === 'customer')
    if (!lastCustomer) return
    const fullText = lastCustomer.content ?? ''
    if (!fullText) return

    // Only run the typewriter for the most recent message (the tail of the history).
    const startedAnimations = typingRef.current ?? 0
    if (startedAnimations >= messages.length) return

    setIsTyping(true)
    setTypingText('')
    const words = fullText.split(' ')
    let idx = 0

    const tick = () => {
      idx += 1
      setTypingText(words.slice(0, idx).join(' '))
      if (idx < words.length) {
        typingRef.current = window.setTimeout(tick, 28)
      } else {
        setIsTyping(false)
        typingRef.current = null
      }
    }
    typingRef.current = window.setTimeout(tick, 50)
  }, [messages, isTyping])

  // Cleanup the typewriter timer on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) window.clearTimeout(typingRef.current)
    }
  }, [])

  // ─── Start Session ────────────────────────────────────────────
  async function handleStartSession(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await startSession({
        mode,
        product_context: productContext,
        scenario,
        persona: persona.trim() || null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start session'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Load Existing Session ────────────────────────────────────
  async function handleLoadExistingSession(e: React.FormEvent) {
    e.preventDefault()
    if (!existingSessionId.trim()) return

    setLoading(true)
    setError(null)

    try {
      await loadExistingSession(existingSessionId.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load existing session'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Send Agent Message (single conversationTurn call via context) ──
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!agentInput.trim() || !isSessionActive || turnStatus === 'pending') return

    const agentMsg = agentInput.trim()
    setAgentInput('')

    try {
      // submitTurn calls POST /api/conversation/turn ONCE and updates context state.
      await submitTurn(agentMsg)
    } catch {
      // turnStatus is now "error" in context; the inline error banner will render.
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 h-full max-w-[1600px] mx-auto w-full pb-12">

      {/* ── Header Banner ── */}
      <div className="shrink-0 bg-white border border-gray-200 rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-sm mb-6">
        <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              <span className={`h-2 w-2 rounded-full ${isSessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {isSessionActive ? 'Live Session Active' : 'Configure New Session'}
            </div>
            <h1 className="mt-2.5 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Live <span className="text-emerald-600">Support</span> Console
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-3xl">
              {isSessionActive
                ? `Simulator Mode • Session ID: ${(sessionId ?? '').slice(0, 8)}... • Thread ID: ${(threadId ?? '').slice(0, 8)}...`
                : 'Configure a session below to start simulating real customer support interactions and testing your AI RAG pipelines.'}
            </p>
          </div>
          {isSessionActive && (
            <button
              onClick={endSession}
              className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-5 py-2.5 text-sm font-semibold hover:bg-rose-100 hover:border-rose-300 shadow-sm transition-all"
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

      {/* ── Session Config (shown when no active session) ── */}
      {!isSessionActive && (
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 max-w-2xl mx-auto w-full">

          {/* ── Mode Toggle: New Session vs Load Existing ── */}
          <div className="flex rounded-xl border border-gray-200 p-1 bg-slate-50 mb-6">
            <button
              type="button"
              onClick={() => { setSessionMode('new'); setError(null); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                sessionMode === 'new'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Session
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setSessionMode('existing'); setError(null); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                sessionMode === 'existing'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Load Existing Session
              </span>
            </button>
          </div>

          {sessionMode === 'new' ? (
            <form onSubmit={handleStartSession} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">Conversation Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as CreateSessionModeBackend)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    disabled={loading}
                  >
                    <option value="Simulator">Simulator — AI-Generated Customer</option>
                    <option value="Manual">Manual — You Play Both Roles</option>
                    <option value="Replay">Replay — Review Past Sessions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Product / Service Context <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productContext}
                    onChange={(e) => setProductContext(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g., Enterprise SaaS Billing Support"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Persona <span className="text-xs font-normal text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g., Frustrated Customer demanding a refund"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Scenario <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm min-h-[120px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
                    placeholder="Describe the exact situation the customer is facing..."
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Initializing AI Simulator...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Simulation
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoadExistingSession} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Session ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={existingSessionId}
                    onChange={(e) => setExistingSessionId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Paste the session ID from Session Configuration..."
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Enter the session ID generated by the <strong>Session Configuration</strong> page to reuse that session in the Live Console.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !existingSessionId.trim()}
                className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading Session...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c2 2 6 2 8 2s6 0 8-2V7M4 7c2-2 6-2 8-2s6 0 8 2M4 7c2 2 6 2 8 2s6 0 8-2" />
                    </svg>
                    Load & Start Simulator
                  </>
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-6 rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3.5">
              <div className="shrink-0 text-rose-500 mt-0.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-900">Error</h4>
                <p className="text-sm text-rose-700 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Live Console Workspace (shown when session is active) ── */}
      {isSessionActive && (
        <div className="flex-1 flex flex-col gap-6 w-full">

          {/* ── Non-silent turn error banner (task 1 Q4 fix) ── */}
          {turnStatus === 'error' && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3.5">
              <div className="shrink-0 text-rose-500 mt-0.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-rose-900">This turn failed to process</h4>
                <p className="text-sm text-rose-700 mt-1 leading-relaxed">
                  The conversation could not be analyzed. Please try sending your reply again.
                </p>
              </div>
            </div>
          )}

          {/* Top Half: 50/50 Split for Chat and Intent Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Left Side: Chat Interface (h-[600px] fixed height) */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-[600px] overflow-hidden">
              <div className="shrink-0 border-b border-gray-100 px-5 py-4 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">Customer Interaction</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">Turn {messages.filter(m => m.role !== 'system').length} Tracker</p>
                  </div>
                </div>
                {turnStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI Generating...
                  </span>
                )}
              </div>

              {/* Scrollable Messages Area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/30">
                {messages.length === 0 && !isTyping && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-3xl mb-3 opacity-50">💬</div>
                      <p className="text-sm font-medium text-slate-500">Awaiting Interaction</p>
                      <p className="text-xs text-slate-400 mt-1">Type a response below to start.</p>
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  // Render the last customer message with the typewriter reveal if it's the newest.
                  const isLastCustomer = msg.role === 'customer' && idx === messages.length - 1
                  const displayText = isLastCustomer && typingText ? typingText : msg.content
                  return (
                    <div key={idx} className={`flex ${msg.role === 'customer' ? 'justify-start' : msg.role === 'agent' ? 'justify-end' : 'justify-center'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.role === 'customer' ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm'
                        : msg.role === 'agent' ? 'bg-emerald-600 text-white rounded-tr-sm'
                        : 'bg-amber-50 border border-amber-200 text-amber-900'
                      }`}>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            msg.role === 'customer' ? 'text-slate-500' : msg.role === 'agent' ? 'text-emerald-100' : 'text-amber-600'
                          }`}>
                            {msg.role === 'customer' ? 'Customer' : msg.role === 'agent' ? 'You' : 'System'}
                          </span>
                          {msg.frustrationLevel !== undefined && msg.frustrationLevel !== null && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              msg.frustrationLevel > 60 ? 'bg-red-50 border-red-200 text-red-700' :
                              msg.frustrationLevel > 35 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}>
                              😤 Level: {msg.frustrationLevel}
                            </span>
                          )}
                        </div>
                        <p className={`text-[13px] leading-relaxed ${msg.role === 'agent' ? 'text-white' : 'text-slate-800'}`}>
                          {displayText}
                          {isLastCustomer && isTyping && (
                            <span className="inline-block w-1 h-3 bg-emerald-500 ml-0.5 animate-pulse align-baseline" />
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {isTyping && typingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-emerald-200 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Customer Typing</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[13px] text-gray-900 leading-relaxed">
                        {typingText}
                        <span className="inline-block w-1 h-3 bg-emerald-500 ml-0.5 animate-pulse align-baseline" />
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Agent Input Bar */}
              <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Reply to customer..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-slate-50 focus:bg-white shadow-inner focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                    disabled={turnStatus === 'pending' || isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!agentInput.trim() || turnStatus === 'pending' || isTyping}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {turnStatus === 'pending' ? (
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

            {/* Right Side: Intent & Sentiment Dashboard (h-[600px] fixed height) */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm h-[600px] flex flex-col overflow-hidden">
              <div className="shrink-0 border-b border-gray-100 px-6 py-5 bg-slate-50/50">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Real-Time AI Intent & Sentiment
                </h3>
                <p className="text-xs text-slate-500 mt-1">Live metrics evaluating the customer's current emotional state.</p>
              </div>

              <div className="flex-1 p-6 flex flex-col justify-center bg-slate-50/20">
                {latestIntentSentiment ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                    {/* Intent Card */}
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Classified Intent</div>
                      <div className="text-xl md:text-2xl font-extrabold text-indigo-700 capitalize leading-tight">
                        {latestIntentSentiment?.intent?.replace(/_/g, ' ') || 'General Question'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">Core reason for contact</p>
                    </div>

                    {/* Emotion Card */}
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Detected Emotion</div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-base font-bold capitalize shadow-sm ${
                          EMOTION_COLORS[latestIntentSentiment?.emotion || 'neutral'] || 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {latestIntentSentiment?.emotion || 'Neutral'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3">Primary emotional state</p>
                    </div>

                    {/* Frustration Gauge */}
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Frustration Level</div>
                        <span className="text-xl font-extrabold text-slate-900">{latestIntentSentiment?.frustration_score || 0}<span className="text-sm text-slate-400 font-medium">/100</span></span>
                      </div>
                      <div className="mt-2 relative">
                        <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              (latestIntentSentiment?.frustration_score || 0) > 75 ? 'bg-red-500' :
                              (latestIntentSentiment?.frustration_score || 0) > 40 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${latestIntentSentiment?.frustration_score || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-2 px-1">
                          <span>Calm</span>
                          <span>Elevated</span>
                          <span>Critical</span>
                        </div>
                      </div>
                    </div>

                    {/* Satisfaction Trend */}
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Satisfaction Trend</div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-2xl shadow-sm">
                          {TREND_ICONS[latestIntentSentiment?.satisfaction_trend || 'stable'] || '➡️'}
                        </div>
                        <div>
                          <div className="text-xl font-extrabold text-slate-900 capitalize">
                            {latestIntentSentiment?.satisfaction_trend || 'Stable'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">Trajectory</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">Awaiting Conversation Data</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">AI analytics will populate automatically as soon as the customer responds.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Knowledge Base & Coaching Span Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Knowledge Base Results (Takes up 2/3 of bottom area) */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
              <div className="shrink-0 border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Agent Knowledge Base Retrieval
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">
                  RAG Pipeline
                </span>
              </div>

              <div className="p-6 bg-slate-50/20 flex-1">
                {latestKnowledgeResults ? (
                  latestKnowledgeResults?.results?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {latestKnowledgeResults.results.map((result, idx) => (
                        <div key={idx} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-700 border border-blue-100">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-sm">
                              {((result?.relevance_score || 0) * 100).toFixed(0)}% MATCH
                            </span>
                          </div>
                          <p className="text-[13px] text-gray-800 leading-relaxed font-medium mb-3 line-clamp-3">
                            "{result?.chunk_text}"
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 py-1.5 px-2.5 rounded-lg border border-slate-100 mb-3 truncate">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{result?.source_document}</span>
                          </div>
                          {result?.why_relevant && (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                                AI Reasoning
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">{result.why_relevant}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="text-3xl mb-3 opacity-50">📂</div>
                      <p className="text-sm font-bold text-slate-700">No Knowledge Found</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">The semantic search returned no highly relevant documents for the last interaction.</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="text-3xl mb-3 opacity-30">🔍</div>
                    <p className="text-sm font-bold text-slate-700">Awaiting Search Query</p>
                    <p className="text-xs text-slate-500 mt-1">Knowledge base results will automatically trigger when the customer asks a question.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Coaching (Takes up 1/3 of bottom area) — now from live context */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
              <div className="shrink-0 border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Live Coaching
                </h3>
              </div>
              <div className="p-6 flex flex-col justify-center items-center h-full text-center">
                {latestCoachingSuggestion ? (
                  <>
                    {latestCoachingSuggestion.coaching_tips?.length > 0 && (
                      <div className="w-full text-left mb-4 space-y-2">
                        {latestCoachingSuggestion.coaching_tips.map((tip, i) => (
                          <div key={i} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-left">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">Tip {i + 1}</div>
                            <p className="text-[12px] text-slate-800 leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {latestCoachingSuggestion.suggested_response && (
                      <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 text-left">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Suggested Response</div>
                        <p className="text-[13px] text-slate-800 leading-relaxed">{latestCoachingSuggestion.suggested_response}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-100">
                      <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">Awaiting Coaching</h4>
                    <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                      Coaching suggestions will appear here after the first turn is analyzed.
                    </p>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

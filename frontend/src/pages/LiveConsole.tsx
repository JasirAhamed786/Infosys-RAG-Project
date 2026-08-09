import React, { useEffect, useRef, useState } from 'react'
import {
  type CreateSessionModeBackend,
} from '../services/api'
import { useSession, type ChatMessage } from '../context/SessionContext'

// ─── Emotion Color Map (tokenized, disciplined 3-tone + neutral) ──
const EMOTION_COLORS: Record<string, string> = {
  angry: 'bg-[#FDEBEA] border-[#F6B5B0] text-[#F04438]',
  frustrated: 'bg-[#FDEBEA] border-[#F6B5B0] text-[#F04438]',
  urgent: 'bg-[#FDEBEA] border-[#F6B5B0] text-[#F04438]',
  anxious: 'bg-[#FEF3E2] border-[#FAD9A8] text-[#F79009]',
  confused: 'bg-[#FEF3E2] border-[#FAD9A8] text-[#F79009]',
  disappointed: 'bg-[#FEF3E2] border-[#FAD9A8] text-[#F79009]',
  neutral: 'bg-[#F2F4F7] border-[#E4E7EC] text-[#667085]',
  calm: 'bg-[#E7F7EF] border-[#B7E8CF] text-[#12B76A]',
  satisfied: 'bg-[#E7F7EF] border-[#B7E8CF] text-[#12B76A]',
}

const TREND_ICONS: Record<string, string> = {
  improving: '↑',
  declining: '↓',
  stable: '→',
  baseline: '·',
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
  const typingGenRef = useRef<number>(0)
  const lastAnimatedIdRef = useRef<string | null>(null)
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  // Tracks whether the user is near the bottom of the chat. Auto-scroll only
  // fires when a NEW message is appended AND the user was already near the
  // bottom — the standard "stick to bottom" chat pattern (Bug 2).
  const isNearBottomRef = useRef(true)
  const lastMessageCountRef = useRef(0)

  // ─── Defensive remount reset ──────────────────────────────────
  useEffect(() => {
    typingGenRef.current += 1
    setIsTyping(false)
    setTypingText('')
    if (typingRef.current) {
      window.clearTimeout(typingRef.current)
      typingRef.current = null
    }
  }, [])

  // ─── Auto-Scroll ("stick to bottom") ──────────────────────────
  // Only auto-scroll when the number of messages GROWS (a new message was
  // appended) and the user was near the bottom when it arrived. Typewriter
  // ticks (typingText / isTyping) no longer trigger a forced scroll.
  useEffect(() => {
    const scrollEl = messagesScrollRef.current
    if (!scrollEl) return

    const messageCount = messages.length
    const grew = messageCount > lastMessageCountRef.current
    lastMessageCountRef.current = messageCount

    if (grew && isNearBottomRef.current) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  // ─── Scroll position tracking ─────────────────────────────────
  function handleChatScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight
    // Within ~80px of the bottom counts as "near bottom".
    isNearBottomRef.current = distanceFromBottom < 80
  }

// ─── Typewriter effect ──
  useEffect(() => {
    const lastCustomer = [...messages].reverse().find((m) => m.role === 'customer')
    if (!lastCustomer) return
    const fullText = lastCustomer.content ?? ''
    if (!fullText) return

    const identity = `${lastCustomer.turnIndex}|${fullText.slice(0, 40)}`
    if (lastAnimatedIdRef.current === identity) return

    const gen = (typingGenRef.current += 1)
    lastAnimatedIdRef.current = identity

    setIsTyping(true)
    setTypingText('')
    const words = fullText.split(' ')
    let idx = 0

    const tick = () => {
      if (typingGenRef.current !== gen) return
      idx += 1
      setTypingText(words.slice(0, idx).join(' '))
      if (idx < words.length) {
        typingRef.current = window.setTimeout(tick, 28)
      } else {
        setIsTyping(false)
        setTypingText('')
        typingRef.current = null
      }
    }
    typingRef.current = window.setTimeout(tick, 50)

    const forceDone = window.setTimeout(() => {
      if (typingGenRef.current !== gen) return
      setIsTyping(false)
      setTypingText('')
    }, words.length * 28 + 1500)
    return () => {
      if (typingRef.current) window.clearTimeout(typingRef.current)
      window.clearTimeout(forceDone)
    }
  }, [messages])

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

  // ─── Send Agent Message ──
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!agentInput.trim() || !isSessionActive || turnStatus === 'pending') return

    const agentMsg = agentInput.trim()
    setAgentInput('')

    try {
      await submitTurn(agentMsg)
    } catch {
      // turnStatus is now "error" in context; the inline error banner will render.
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0 h-full max-w-[1600px] mx-auto w-full pb-12">

{/* ── Dark hero header band ── */}
      <div className="shrink-0 rounded-2xl border border-[#16283c] bg-gradient-to-r from-[#0A1A2E] via-[#0E2740] to-[#0B2A37] p-5 md:p-6 mb-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 brand-grad" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C7D2E8] bg-gradient-to-r from-[#E9EDF6] to-[#E7F7EF] px-3.5 py-1 text-xs font-medium text-[#0E2B6C]">
              <span className={`h-1.5 w-1.5 rounded-full ${isSessionActive ? 'bg-[#12B76A]' : 'bg-[#C7CED9]'}`} />
              {isSessionActive ? 'Live Session Active' : 'Configure New Session'}
            </div>
            <h1 className="mt-2.5 text-2xl md:text-3xl font-display font-semibold tracking-tight text-white">
              Live Support Console
            </h1>
            <p className="mt-1 text-sm text-[#9DB7CF] max-w-3xl">
              {isSessionActive
                ? `Simulator Mode • Session ID: ${(sessionId ?? '').slice(0, 8)}... • Thread ID: ${(threadId ?? '').slice(0, 8)}...`
                : 'Configure a session to start simulating real customer support interactions and testing the AI RAG pipeline.'}
            </p>
          </div>
          {isSessionActive && (
            <button
              onClick={endSession}
              className="shrink-0 rounded-lg border border-[#F6B5B0] bg-white/10 text-[#FFB4AD] px-5 py-2.5 text-sm font-medium hover:bg-[#FDEBEA] hover:text-[#F04438] transition-colors"
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 max-w-2xl mx-auto w-full shadow-sm">

          {/* ── Mode Toggle: New Session vs Load Existing ── */}
          <div className="flex rounded-lg border border-[#E4E7EC] p-1 bg-[#F2F4F7] mb-6">
            <button
              type="button"
              onClick={() => { setSessionMode('new'); setError(null); }}
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
                sessionMode === 'new'
                  ? 'bg-white text-[#0E2B6C] border border-[#C7D2E8]'
                  : 'text-[#667085] hover:text-[#101828]'
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
              className={`flex-1 rounded-md py-2.5 text-sm font-medium transition-colors ${
                sessionMode === 'existing'
                  ? 'bg-white text-[#0E2B6C] border border-[#C7D2E8]'
                  : 'text-[#667085] hover:text-[#101828]'
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
                  <label className="block text-sm font-medium text-[#101828] mb-1.5">Conversation Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as CreateSessionModeBackend)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-4 py-3 text-sm font-medium text-[#101828] bg-white focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7]"
                    disabled={loading}
                  >
                    <option value="Simulator">Simulator — AI-Generated Customer</option>
                    <option value="Manual">Manual — You Play Both Roles</option>
                    <option value="Replay">Replay — Review Past Sessions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1.5">
                    Product / Service Context <span className="text-[#F04438]">*</span>
                  </label>
                  <input
                    type="text"
                    value={productContext}
                    onChange={(e) => setProductContext(e.target.value)}
                    className="gradient-placeholder w-full rounded-lg border border-[#C7D2E8] px-4 py-3 text-sm text-[#101828] bg-white focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7]"
                    placeholder="e.g., Enterprise SaaS Billing Support"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1.5">
                    Persona <span className="text-xs font-normal text-[#667085]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-4 py-3 text-sm text-[#101828] placeholder-[#98A2B3] bg-white focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7]"
                    placeholder="e.g., Frustrated Customer demanding a refund"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1.5">
                    Scenario <span className="text-[#F04438]">*</span>
                  </label>
                  <textarea
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-4 py-3 text-sm text-[#101828] placeholder-[#98A2B3] bg-white min-h-[120px] focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 resize-y disabled:bg-[#F2F4F7]"
                    placeholder="Describe the exact situation the customer is facing..."
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
className="w-full inline-flex items-center justify-center rounded-lg brand-grad px-8 py-3.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
                  <label className="block text-sm font-medium text-[#101828] mb-1.5">
                    Session ID <span className="text-[#F04438]">*</span>
                  </label>
                  <input
                    type="text"
                    value={existingSessionId}
                    onChange={(e) => setExistingSessionId(e.target.value)}
                    className="w-full rounded-lg border border-[#D0D5DD] px-4 py-3 text-sm text-[#101828] placeholder-[#98A2B3] bg-white focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 disabled:bg-[#F2F4F7]"
                    placeholder="Paste the session ID from Session Configuration..."
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-[#667085] mt-2">
                    Enter the session ID generated by the <strong>Session Configuration</strong> page to reuse that session in the Live Console.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !existingSessionId.trim()}
                className="w-full inline-flex items-center justify-center rounded-lg brand-grad px-8 py-3.5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
            <div className="mt-6 rounded-lg border border-[#F6B5B0] bg-[#FDEBEA] p-4 flex items-start gap-3.5">
              <div className="shrink-0 text-[#F04438] mt-0.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#F04438]">Error</h4>
                <p className="text-sm text-[#F04438]/90 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Live Console Workspace (shown when session is active) ── */}
      {isSessionActive && (
        <div className="flex-1 flex flex-col gap-6 w-full">

          {/* ── Non-silent turn error banner (calm) ── */}
          {turnStatus === 'error' && (
            <div className="rounded-lg border border-[#F6B5B0] bg-[#FDEBEA] p-4 flex items-start gap-3.5">
              <div className="shrink-0 text-[#F04438] mt-0.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#F04438]">This turn failed to process</h4>
                <p className="text-sm text-[#F04438]/90 mt-1 leading-relaxed">
                  The conversation could not be analyzed. Please try sending your reply again.
                </p>
              </div>
            </div>
          )}

          {/* Top Half: 50/50 Split for Chat and Intent Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

{/* Left Side: Chat Interface */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col lg:h-[600px] min-h-[480px] overflow-hidden fade-in-up">
              <div className="shrink-0 border-b border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#E9EDF6] flex items-center justify-center text-[#0E2B6C]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#101828] text-sm">Customer Interaction</h2>
                    <p className="text-[11px] text-[#667085] mt-0.5">Turn {messages.filter(m => m.role !== 'system').length} Tracker</p>
                  </div>
                </div>
                {turnStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7D2E8] bg-[#E9EDF6] px-2.5 py-1 text-[11px] font-medium text-[#0E2B6C]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0E2B6C] animate-pulse" />
                    Analyzing turn...
                  </span>
                )}
              </div>

{/* Scrollable Messages Area */}
              <div
                ref={messagesScrollRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gradient-to-b from-[#f3f8ff] via-[#f4fafa] to-[#eef7f3]"
              >
                {messages.length === 0 && !isTyping && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
                        <svg className="h-6 w-6 text-[#B9C1CF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[#667085]">Awaiting interaction</p>
                      <p className="text-xs text-[#98A2B3] mt-1">Type a response below to start.</p>
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isLastCustomer = msg.role === 'customer' && idx === messages.length - 1
                  const displayText = isLastCustomer && typingText ? typingText : msg.content
                  return (
                    <div key={idx} className={`flex ${msg.role === 'customer' ? 'justify-start' : msg.role === 'agent' ? 'justify-end' : 'justify-center'}`}>
                      <div className={`max-w-[85%] rounded-lg px-4 py-3 shadow-sm ${msg.role === 'customer' ? 'bg-white/95 border border-[#C7D2E8] text-[#101828] panel-blue hover-lift' : msg.role === 'agent' ? 'bg-gradient-to-br from-[#0E2B6C] to-[#059669] text-white' : 'bg-[#FEF3E2] border border-[#FAD9A8] text-[#7A4E00]'}`}>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${msg.role === 'customer' ? 'text-[#0E2B6C]' : msg.role === 'agent' ? 'text-[#DCF5E9]' : 'text-[#B26A00]'}`}>
                            {msg.role === 'customer' ? 'Customer' : msg.role === 'agent' ? 'You' : 'System'}
                          </span>
                          {msg.frustrationLevel !== undefined && msg.frustrationLevel !== null && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${msg.frustrationLevel > 60 ? 'bg-[#FDEBEA] border-[#F6B5B0] text-[#F04438]' : msg.frustrationLevel > 35 ? 'bg-[#FEF3E2] border-[#FAD9A8] text-[#F79009]' : 'bg-[#E7F7EF] border-[#B7E8CF] text-[#12B76A]'}`}>
                              Level: {msg.frustrationLevel}
                            </span>
                          )}
                        </div>
                        <p className={`text-[13px] leading-relaxed ${msg.role === 'agent' ? 'text-white' : 'text-[#101828]'}`}>
                          {displayText}
                          {isLastCustomer && isTyping && (
                            <span className="inline-block w-1 h-3 bg-[#0E2B6C] ml-0.5 animate-pulse align-baseline" />
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Agent Input Bar */}
              <div className="shrink-0 border-t border-[#E4E7EC] p-4 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Reply to customer..."
                    className="flex-1 rounded-lg border border-[#D0D5DD] px-4 py-3 text-sm text-[#101828] placeholder-[#98A2B3] bg-white focus:border-[#0E2B6C] focus:outline-none focus:ring-2 focus:ring-[#0E2B6C]/20 transition-colors disabled:bg-[#F2F4F7]"
                    disabled={turnStatus === 'pending' || isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!agentInput.trim() || turnStatus === 'pending' || isTyping}
                    className="inline-flex items-center justify-center rounded-lg brand-grad px-6 py-3 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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

{/* Right Side: Intent & Sentiment Dashboard */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col lg:h-[600px] min-h-[480px] overflow-hidden fade-in-up">
              <div className="shrink-0 border-b border-slate-200 px-6 py-5 bg-slate-50/50">
                <h3 className="font-semibold text-[#101828] text-base flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#0E7490]" />
                  Real-Time AI Intent & Sentiment
                </h3>
                <p className="text-xs text-[#667085] mt-1">Live metrics evaluating the customer's current emotional state.</p>
              </div>

              <div className="flex-1 p-6 flex flex-col justify-center bg-[#FAFBFC]/80">
                {latestIntentSentiment ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                    {/* Intent Card */}
                    <div className="rounded-lg panel-blue hover-lift p-6 flex flex-col justify-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#0E2B6C] mb-2">Classified Intent</div>
                      <div className="text-xl md:text-2xl font-semibold text-[#0E2B6C] capitalize leading-tight">
                        {latestIntentSentiment?.intent?.replace(/_/g, ' ') || 'General Question'}
                      </div>
                      <p className="text-[11px] text-[#98A2B3] mt-2">Core reason for contact</p>
                    </div>

                    {/* Emotion Card */}
                    <div className="rounded-lg panel-teal hover-lift p-6 flex flex-col justify-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#0E7490] mb-3">Detected Emotion</div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-base font-semibold capitalize ${EMOTION_COLORS[latestIntentSentiment?.emotion || 'neutral'] || 'bg-[#F2F4F7] border-[#E4E7EC] text-[#667085]'}`}>
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {latestIntentSentiment?.emotion || 'Neutral'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#98A2B3] mt-3">Primary emotional state</p>
                    </div>

{/* Frustration Gauge */}
                    <div className="rounded-lg panel-amber hover-lift p-6 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#667085]">Frustration Level</div>
                        <span className="text-xl font-semibold text-[#101828]">{latestIntentSentiment?.frustration_score || 0}<span className="text-sm text-[#98A2B3] font-medium">/100</span></span>
                      </div>
                      <div className="mt-2 relative">
                        <div className="h-3.5 rounded-full bg-[#F2F4F7] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${(latestIntentSentiment?.frustration_score || 0) > 75 ? 'bg-[#F04438]' : (latestIntentSentiment?.frustration_score || 0) > 40 ? 'bg-[#F79009]' : 'bg-[#12B76A]'}`}
                            style={{ width: `${latestIntentSentiment?.frustration_score || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-medium text-[#98A2B3] mt-2 px-1">
                          <span>Calm</span>
                          <span>Elevated</span>
                          <span>Critical</span>
                        </div>
                      </div>
                    </div>

                    {/* Satisfaction Trend */}
                    <div className="rounded-lg panel-green hover-lift p-6 flex flex-col justify-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#667085] mb-2">Satisfaction Trend</div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F2F4F7] border border-[#E4E7EC] text-xl text-[#0E2B6C]">
                          {TREND_ICONS[latestIntentSentiment?.satisfaction_trend || 'stable'] || '→'}
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-[#101828] capitalize">
                            {latestIntentSentiment?.satisfaction_trend || 'Stable'}
                          </div>
                          <div className="text-[11px] text-[#667085] font-medium">Trajectory</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 bg-[#F2F4F7] rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#B9C1CF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[#101828]">Awaiting conversation data</h3>
                    <p className="text-xs text-[#667085] mt-1 max-w-xs">AI analytics will populate automatically as soon as the customer responds.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Knowledge Base & Coaching Span Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

{/* Knowledge Base Results (2/3) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col fade-in-up">
              <div className="shrink-0 border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-[8px]">
                <h3 className="font-semibold text-[#101828] text-sm flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#0E7490]" />
                  Agent Knowledge Base Retrieval
                </h3>
                <span className="text-[11px] font-medium text-[#0E7490] bg-white/70 px-2.5 py-1 rounded-md border border-[#a9e0ea]">
                  RAG Pipeline
                </span>
              </div>

              <div className="p-6 bg-[#FAFBFC]/70 flex-1">
                {latestKnowledgeResults ? (
                  latestKnowledgeResults?.results?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {latestKnowledgeResults.results.map((result, idx) => (
                        <div key={idx} className="rounded-lg border border-[#E4E7EC] bg-white p-5">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E9EDF6] text-[10px] font-semibold text-[#0E2B6C] border border-[#C7D2E8]">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-semibold text-[#12B76A] bg-[#E7F7EF] border border-[#B7E8CF] px-2.5 py-1 rounded-lg">
                              {((result?.relevance_score || 0) * 100).toFixed(0)}% MATCH
                            </span>
                          </div>
                          <p className="text-[13px] text-[#101828] leading-relaxed font-medium mb-3 line-clamp-3">
                            "{result?.chunk_text}"
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#667085] bg-[#F2F4F7] py-1.5 px-2.5 rounded-lg border border-[#E4E7EC] mb-3 truncate">
                            <svg className="w-3.5 h-3.5 text-[#B9C1CF] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{result?.source_document}</span>
                          </div>
                          {result?.why_relevant && (
                            <div className="pt-3 border-t border-[#E4E7EC]">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0E2B6C] mb-1">
                                AI Reasoning
                              </div>
                              <p className="text-[11px] text-[#667085] leading-relaxed line-clamp-2">{result.why_relevant}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="mx-auto h-12 w-12 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
                        <svg className="h-6 w-6 text-[#B9C1CF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">No knowledge found</p>
                      <p className="text-xs text-[#667085] mt-1 max-w-sm">The semantic search returned no highly relevant documents for the last interaction.</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
                      <svg className="h-6 w-6 text-[#B9C1CF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#101828]">Awaiting search query</p>
                    <p className="text-xs text-[#667085] mt-1">Knowledge base results will automatically trigger when the customer asks a question.</p>
                  </div>
                )}
              </div>
            </div>

{/* Live Coaching (1/3) */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col fade-in-up">
              <div className="shrink-0 border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50/50 rounded-t-[8px]">
                <h3 className="font-semibold text-[#101828] text-sm flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#0EA5E9]" />
                  Live Coaching
                </h3>
              </div>
              <div className="p-6 flex flex-col justify-center items-center h-full text-center bg-white/60">
                {latestCoachingSuggestion ? (
                  <>
                    {latestCoachingSuggestion.coaching_tips?.length > 0 && (
                      <div className="w-full text-left mb-4 space-y-2">
                        {latestCoachingSuggestion.coaching_tips.map((tip, i) => (
                          <div key={i} className="rounded-lg bg-white/80 border border-[#bae0f5] px-3 py-2 text-left">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0E2B6C] mb-0.5">Tip {i + 1}</div>
                            <p className="text-[12px] text-[#101828] leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {latestCoachingSuggestion.suggested_response && (
                      <div className="w-full rounded-lg bg-white border border-[#E4E7EC] p-4 text-left">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#667085] mb-1">Suggested Response</div>
                        <p className="text-[13px] text-[#101828] leading-relaxed">{latestCoachingSuggestion.suggested_response}</p>
                        <button
                          type="button"
                          onClick={() => setAgentInput(latestCoachingSuggestion.suggested_response ?? '')}
                          disabled={turnStatus === 'pending' || isTyping}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg brand-grad px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Use this reply
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-4 border border-[#E4E7EC]">
                      <svg className="w-8 h-8 text-[#B9C1CF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-semibold text-[#101828] mb-2">Awaiting coaching</h4>
                    <p className="text-[13px] text-[#667085] leading-relaxed mb-6">
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

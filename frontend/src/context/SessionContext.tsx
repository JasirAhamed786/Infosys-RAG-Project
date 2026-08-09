import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  createSession,
  startSimulator,
  getSession,
  conversationTurn,
  type CreateSessionModeBackend,
  type SessionDetailResponse,
} from '../services/api'

// ─── Types ────────────────────────────────────────────────────────

export type TurnStatus = 'idle' | 'pending' | 'error'

export interface SessionConfig {
  mode: CreateSessionModeBackend
  product_context: string
  scenario: string
  persona: string | null
}

export interface ChatMessage {
  role: 'customer' | 'agent' | 'system'
  content: string
  turnIndex: number
  // Set true for the agent's own message rendered optimistically (before the
  // backend pipeline resolves). The confirmed message replaces it on success.
  optimistic?: boolean
// Temporary client-side id so TURN_ERROR can flag the optimistic message.
  tempId?: string
  // Set true when the optimistic send ultimately failed (TURN_ERROR).
  sendFailed?: boolean
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

export interface IntentSentimentResult {
  intent: string
  emotion: string
  frustration_score: number
  satisfaction_trend: string
}

export interface KnowledgeResult {
  results: {
    chunk_text: string
    source_document: string
    relevance_score: number
    why_relevant: string
  }[]
  note?: string
}

export interface CoachingSuggestion {
  coaching_tips: string[]
  suggested_response: string
  tone_feedback?: string
  communication_tips?: string[]
  confidence?: number
}

export interface EscalationResult {
  escalation_risk: number
  risk_level: string
  reasoning: string[]
  recommended_action?: string
  alert_triggered: boolean
  score: number
}

export interface EscalationHistoryEntry {
  turnIndex: number
  escalation: EscalationResult
  timestamp: string
}

interface SessionState {
  sessionId: string | null
  threadId: string | null
  sessionMode: CreateSessionModeBackend | null
  // Config captured at start/load time so submitTurn() can pass real values.
  // The backend conversation_turn handler does NOT fall back to stored session
  // values — it passes req.product_context/scenario/persona straight into the
  // pipeline, so we must send the real values, not blanks.
  productContext: string
  scenario: string
  persona: string | null
  isSessionActive: boolean
  messages: ChatMessage[]
  latestIntentSentiment: IntentSentimentResult | null
  latestKnowledgeResults: KnowledgeResult | null
  latestCoachingSuggestion: CoachingSuggestion | null
  latestEscalation: EscalationResult | null
  escalationHistory: EscalationHistoryEntry[]
  turnStatus: TurnStatus
  // Incremented once per successful TURN_SUCCESS — NOT derived from messages.length
  // (each turn appends 2 messages: agent + customer).
  turnCount: number
}

const INITIAL_STATE: SessionState = {
  sessionId: null,
  threadId: null,
  sessionMode: null,
  productContext: '',
  scenario: '',
  persona: null,
  isSessionActive: false,
  messages: [],
  latestIntentSentiment: null,
  latestKnowledgeResults: null,
  latestCoachingSuggestion: null,
  latestEscalation: null,
  escalationHistory: [],
  turnStatus: 'idle',
  turnCount: 0,
}

// ─── Actions ──────────────────────────────────────────────────────

type SessionAction =
  | {
      type: 'SESSION_STARTED'
      sessionId: string
      threadId: string
      mode: CreateSessionModeBackend
      productContext: string
      scenario: string
      persona: string | null
      messages: ChatMessage[]
}
  | {
      type: 'AGENT_MESSAGE_SENT'
      payload: {
        content: string
        tempId: string
        turnIndex: number
      }
    }
  | { type: 'TURN_PENDING' }
  | {
      type: 'TURN_SUCCESS'
      payload: {
        agentMessage: string
        agentMessageTempId?: string
        customerMessage: string
        customerTurnIndex: number
        intentSentiment: IntentSentimentResult | null
        knowledge: KnowledgeResult | null
        coaching: CoachingSuggestion | null
        escalation: EscalationResult | null
        frustrationLevel: number | null
      }
    }
  | { type: 'TURN_ERROR'; message: string; failedTempId?: string }
  | { type: 'SESSION_ENDED' }

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SESSION_STARTED':
      return {
        ...INITIAL_STATE,
        sessionId: action.sessionId,
        threadId: action.threadId,
        sessionMode: action.mode,
        productContext: action.productContext,
        scenario: action.scenario,
        persona: action.persona,
        isSessionActive: true,
        messages: action.messages,
        turnStatus: 'idle',
      }

case 'AGENT_MESSAGE_SENT':
      // Optimistic render: the agent sees their own message the instant they
      // hit send, before the backend pipeline resolves. Marked optimistic so
      // TURN_SUCCESS can reconcile (replace) it instead of duplicating.
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: 'agent',
            content: action.payload.content,
            turnIndex: action.payload.turnIndex,
            optimistic: true,
            tempId: action.payload.tempId,
          },
        ],
      }

    case 'TURN_PENDING':
      return { ...state, turnStatus: 'pending' }

    case 'TURN_SUCCESS': {
      const {
        agentMessage,
        agentMessageTempId,
        customerMessage,
        customerTurnIndex,
        intentSentiment,
        knowledge,
        coaching,
        escalation,
        frustrationLevel,
      } = action.payload

      const customerMsg: ChatMessage = {
        role: 'customer',
        content: customerMessage,
        turnIndex: customerTurnIndex,
        intentSentiment,
        knowledge,
        frustrationLevel,
      }

      // Reconcile the optimistic agent message: if a matching optimistic
      // message exists (matched by tempId), replace it with the confirmed one
      // (same content, optimistic flag cleared). Otherwise append the agent
      // message normally (e.g. when no optimistic message exists).
      let nextMessages: ChatMessage[]
      if (agentMessageTempId) {
        let replaced = false
        nextMessages = state.messages.map((m) => {
          if (!replaced && m.optimistic && m.tempId === agentMessageTempId) {
            replaced = true
            return {
              role: 'agent',
              content: agentMessage,
              turnIndex: customerTurnIndex - 1,
            }
          }
          return m
        })
        if (!replaced) {
          nextMessages = [
            ...nextMessages,
            {
              role: 'agent',
              content: agentMessage,
              turnIndex: customerTurnIndex - 1,
            },
          ]
        }
      } else {
        nextMessages = [
          ...state.messages,
          {
            role: 'agent',
            content: agentMessage,
            turnIndex: customerTurnIndex - 1,
          },
        ]
      }
      nextMessages = [...nextMessages, customerMsg]

      const historyEntry: EscalationHistoryEntry = escalation
        ? {
            turnIndex: customerTurnIndex,
            escalation,
            timestamp: new Date().toISOString(),
          }
        : {
            turnIndex: customerTurnIndex,
            escalation: {
              escalation_risk: 0,
              risk_level: 'low',
              reasoning: [],
              alert_triggered: false,
              score: 0,
            },
            timestamp: new Date().toISOString(),
          }

      return {
        ...state,
        messages: nextMessages,
        latestIntentSentiment: intentSentiment,
        latestKnowledgeResults: knowledge,
        latestCoachingSuggestion: coaching,
        latestEscalation: escalation,
        escalationHistory: [...state.escalationHistory, historyEntry],
        turnStatus: 'idle',
        turnCount: state.turnCount + 1,
      }
    }

    case 'TURN_ERROR': {
      // Flag the optimistic agent message as failed so the user sees a clear
      // "failed to send" indicator instead of a message that silently never
      // reached the backend.
      const failedTempId = action.failedTempId
      const messages = failedTempId
        ? state.messages.map((m) =>
            m.optimistic && m.tempId === failedTempId
              ? { ...m, optimistic: false, sendFailed: true }
              : m
          )
        : state.messages
      return { ...state, messages, turnStatus: 'error' }
    }

    case 'SESSION_ENDED':
      return { ...INITIAL_STATE }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────

export interface SessionContextValue extends SessionState {
  startSession: (config: SessionConfig) => Promise<void>
  submitTurn: (message: string) => Promise<void>
  endSession: () => void
  loadExistingSession: (sessionId: string) => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const value = useMemo<SessionContextValue>(() => {
    return {
      ...state,

      // ── startSession: create a new session + start simulator ──
      async startSession(config: SessionConfig) {
        try {
          // 1. Create the session
          const sessionResult = await createSession({
            mode: config.mode,
            product_context: config.product_context,
            scenario: config.scenario,
            persona: config.persona,
          })
          const sessionId = sessionResult.session_id

          // 2. Start the simulator and get the first customer message
          const simResult = await startSimulator({
            session_id: sessionId,
            mode: config.mode,
            product_context: config.product_context,
            scenario: config.scenario,
            persona: config.persona,
          })

          const firstMsg = simResult.messages[0]
          const firstMessages: ChatMessage[] = firstMsg
            ? [{
                role: 'customer',
                content: firstMsg.content,
                turnIndex: firstMsg.turn_index,
              }]
            : []

          dispatch({
            type: 'SESSION_STARTED',
            sessionId: simResult.session_id,
            threadId: simResult.thread_id,
            mode: config.mode,
            productContext: config.product_context,
            scenario: config.scenario,
            persona: config.persona,
            messages: firstMessages,
          })
        } catch (err) {
          // Propagate so the caller can surface the error in the UI form.
          const msg = err instanceof Error ? err.message : 'Failed to start session'
          throw new Error(msg)
        }
      },

      // ── submitTurn: single full-pipeline call per turn ──
      async submitTurn(message: string) {
        if (!state.isSessionActive || !state.sessionId) {
          console.warn('[SessionContext] submitTurn ignored — no active session (isSessionActive=false)')
          return
        }

const trimmed = message.trim()
        if (!trimmed) {
          console.warn('[SessionContext] submitTurn ignored — empty message')
          return
        }

        // Optimistic UI (Bug 3): render the agent's own message the instant they
        // hit send, before the backend pipeline resolves. The tempId lets the
        // reducer reconcile/flag this message when the turn settles.
        const tempId = `agent-${Date.now()}`
        dispatch({
          type: 'AGENT_MESSAGE_SENT',
          payload: {
            content: trimmed,
            tempId,
            turnIndex: state.turnCount,
          },
        })

        // TURN_PENDING now drives the "AI is analyzing" indicator — it does NOT
        // block the agent's own message from appearing (that's optimistic above).
        dispatch({ type: 'TURN_PENDING' })

        // Safety timeout: if the backend /conversation/turn request hangs (e.g. a
        // slow LLM call or a stalled pipeline), we must NOT leave turnStatus in
        // "pending" forever — that disables the reply input (can't type/send),
        // which is exactly the reported freeze after a couple of turns. We race
        // the request against a generous 120s timer; whichever settles first wins.
        // On timeout we dispatch TURN_ERROR so the input reliably re-enables.
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Turn timed out after 120s — the backend did not respond. Please try again.'))
          }, 120_000)
        })

        try {
          const reqPromise = conversationTurn({
            session_id: state.sessionId,
            mode: state.sessionMode ?? 'Simulator',
            product_context: state.productContext,
            scenario: state.scenario,
            persona: state.persona,
            user_message: trimmed,
            turn_index: state.turnCount,
          })

          // If the timeout wins the race, the underlying request may still be
          // in-flight. Swallow its eventual rejection so it doesn't surface as an
          // unhandled promise rejection (the timeout already handled the error UI).
          reqPromise.catch(() => {
            /* intentionally ignored — the 30s timeout already handled this turn */
          })

          const res = await Promise.race([reqPromise, timeoutPromise])
          if (timeoutId) clearTimeout(timeoutId)

          const customerSim = res.customer_simulation ?? {}
          const customerMessage = customerSim.customer_message ?? ''
          const customerTurnIndex =
            res.turn_index ?? customerSim.turn_index ?? state.turnCount + 1

          // Convert coaching. The pipeline returns { coaching_tips,
          // suggested_response, tone_feedback, communication_tips, confidence }.
          // Prefer coaching_tips, but fall back to communication_tips so the
          // coaching panel always has content regardless of which key the
          // backend produced.
          const rawCoaching = res.coaching as (CoachingSuggestion & { coaching_tips?: string[] }) | null
          const coachingTips =
            rawCoaching?.coaching_tips?.length
              ? rawCoaching.coaching_tips
              : (rawCoaching?.communication_tips ?? [])

          const coaching: CoachingSuggestion | null = res.coaching
            ? {
                coaching_tips: coachingTips,
                suggested_response: res.coaching.suggested_response ?? '',
                tone_feedback: res.coaching.tone_feedback,
                communication_tips: res.coaching.communication_tips,
                confidence: res.coaching.confidence,
              }
            : null

          // Convert escalation (pipeline returns { escalation_risk, risk_level,
          // reasoning, recommended_action, alert_triggered }).
          const escalation: EscalationResult | null = res.escalation
            ? {
                escalation_risk: typeof res.escalation.escalation_risk === 'number'
                  ? res.escalation.escalation_risk
                  : 0,
                risk_level: res.escalation.risk_level ?? 'low',
                reasoning: res.escalation.reasoning ?? [],
                recommended_action: res.escalation.recommended_action,
                alert_triggered: res.escalation.alert_triggered ?? (res.escalation.risk_level === 'high'),
                score: typeof res.escalation.escalation_risk === 'number'
                  ? res.escalation.escalation_risk
                  : 0,
              }
            : null

          dispatch({
            type: 'TURN_SUCCESS',
payload: {
              agentMessage: trimmed,
              agentMessageTempId: tempId,
              customerMessage,
              customerTurnIndex,
              intentSentiment: res.intent_sentiment ?? null,
              knowledge: res.knowledge ?? null,
              coaching,
              escalation,
              frustrationLevel: customerSim.internal_frustration_level ?? null,
            },
          })
        } catch (err) {
const msg = err instanceof Error ? err.message : 'Conversation turn failed'
          dispatch({ type: 'TURN_ERROR', message: msg, failedTempId: tempId })
          // Re-throw so the page can optionally surface it; context also holds turnStatus "error".
          throw new Error(msg)
        }
      },

      // ── endSession: reset ALL context state ──
      endSession() {
        dispatch({ type: 'SESSION_ENDED' })
      },

      // ── loadExistingSession: preserve existing behavior exactly ──
      async loadExistingSession(sessionId: string) {
        if (!sessionId.trim()) {
          throw new Error('Session ID is required')
        }

        try {
          const sessionDetail: SessionDetailResponse = await getSession(sessionId.trim())

          const simResult = await startSimulator({
            session_id: sessionDetail.session_id,
            mode: sessionDetail.mode,
            product_context: sessionDetail.product_context,
            scenario: sessionDetail.scenario,
            persona: sessionDetail.persona,
          })

          const firstMsg = simResult.messages[0]
          const firstMessages: ChatMessage[] = firstMsg
            ? [{
                role: 'customer',
                content: firstMsg.content,
                turnIndex: firstMsg.turn_index,
              }]
            : []

          dispatch({
            type: 'SESSION_STARTED',
            sessionId: simResult.session_id,
            threadId: simResult.thread_id,
            mode: sessionDetail.mode,
            productContext: sessionDetail.product_context,
            scenario: sessionDetail.scenario,
            persona: sessionDetail.persona,
            messages: firstMessages,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to load existing session'
          throw new Error(msg)
        }
      },
    }
  }, [state])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// ─── useSession hook ──────────────────────────────────────────────

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within a <SessionProvider>')
  }
  return ctx
}

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
  escalation_risk: string
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
  | { type: 'TURN_PENDING' }
  | {
      type: 'TURN_SUCCESS'
      payload: {
        agentMessage: string
        customerMessage: string
        customerTurnIndex: number
        intentSentiment: IntentSentimentResult | null
        knowledge: KnowledgeResult | null
        coaching: CoachingSuggestion | null
        escalation: EscalationResult | null
        frustrationLevel: number | null
      }
    }
  | { type: 'TURN_ERROR'; message: string }
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

    case 'TURN_PENDING':
      return { ...state, turnStatus: 'pending' }

    case 'TURN_SUCCESS': {
      const {
        agentMessage,
        customerMessage,
        customerTurnIndex,
        intentSentiment,
        knowledge,
        coaching,
        escalation,
        frustrationLevel,
      } = action.payload

      const agentMsg: ChatMessage = {
        role: 'agent',
        content: agentMessage,
        turnIndex: customerTurnIndex - 1,
      }
      const customerMsg: ChatMessage = {
        role: 'customer',
        content: customerMessage,
        turnIndex: customerTurnIndex,
        intentSentiment,
        knowledge,
        frustrationLevel,
      }

      const historyEntry: EscalationHistoryEntry = escalation
        ? {
            turnIndex: customerTurnIndex,
            escalation,
            timestamp: new Date().toISOString(),
          }
        : {
            turnIndex: customerTurnIndex,
            escalation: {
              escalation_risk: 'low',
              risk_level: 'low',
              reasoning: [],
              alert_triggered: false,
              score: 0,
            },
            timestamp: new Date().toISOString(),
          }

      return {
        ...state,
        messages: [...state.messages, agentMsg, customerMsg],
        latestIntentSentiment: intentSentiment,
        latestKnowledgeResults: knowledge,
        latestCoachingSuggestion: coaching,
        latestEscalation: escalation,
        escalationHistory: [...state.escalationHistory, historyEntry],
        turnStatus: 'idle',
        turnCount: state.turnCount + 1,
      }
    }

    case 'TURN_ERROR':
      return { ...state, turnStatus: 'error' }

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

        dispatch({ type: 'TURN_PENDING' })

        try {
          const res = await conversationTurn({
            session_id: state.sessionId,
            mode: state.sessionMode ?? 'Simulator',
            product_context: state.productContext,
            scenario: state.scenario,
            persona: state.persona,
            user_message: trimmed,
            turn_index: state.turnCount,
          })

          const customerSim = res.customer_simulation ?? {}
          const customerMessage = customerSim.customer_message ?? ''
          const customerTurnIndex =
            res.turn_index ?? customerSim.turn_index ?? state.turnCount + 1

          // Convert coaching (pipeline returns { coaching_tips, suggested_response }).
          const coaching: CoachingSuggestion | null = res.coaching
            ? {
                coaching_tips: res.coaching.coaching_tips ?? [],
                suggested_response: res.coaching.suggested_response ?? '',
                tone_feedback: res.coaching.tone_feedback,
                communication_tips: res.coaching.communication_tips,
                confidence: res.coaching.confidence,
              }
            : null

          // Convert escalation (pipeline returns { risk, score, reasons, ... }).
          const escalation: EscalationResult | null = res.escalation
            ? {
                escalation_risk: res.escalation.risk ?? 'low',
                risk_level: res.escalation.risk ?? 'low',
                reasoning: res.escalation.reasons ?? [],
                recommended_action: res.escalation.recommended_action,
                alert_triggered: res.escalation.alert_triggered ?? (res.escalation.risk === 'high'),
                score: res.escalation.score ?? 0,
              }
            : null

          dispatch({
            type: 'TURN_SUCCESS',
            payload: {
              agentMessage: trimmed,
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
          dispatch({ type: 'TURN_ERROR', message: msg })
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

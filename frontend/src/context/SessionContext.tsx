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
  uploadReplayTranscript as apiUploadReplayTranscript,
  replayNext,
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
  // Incremented once per successful TURN_SUCCESS / MANUAL_TURN_SUCCESS — NOT
  // derived from messages.length (each Simulator turn appends 2 messages:
  // agent + customer; Manual/Replay turns append only 1).
  turnCount: number
  // ── Milestone 3: Replay mode step-through state ──
  replayTotal: number
  replayPosition: number
  replayDone: boolean
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
  replayTotal: 0,
  replayPosition: 0,
  replayDone: false,
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
  // ── Milestone 3: Manual mode — one pasted customer message = one turn,
  // no separate agent bubble is created (the agent's real reply happens in
  // whatever external channel they're actually using).
  | {
      type: 'MANUAL_TURN_SUCCESS'
      payload: {
        customerMessage: string
        turnIndex: number
        intentSentiment: IntentSentimentResult | null
        knowledge: KnowledgeResult | null
        coaching: CoachingSuggestion | null
        escalation: EscalationResult | null
        frustrationLevel: number | null
      }
    }
  // ── Milestone 3: Replay mode — transcript loaded / stepped through ──
  | { type: 'REPLAY_LOADED'; total: number }
  | {
      type: 'REPLAY_STEP_SUCCESS'
      payload: {
        role: 'customer' | 'agent'
        content: string
        turnIndex: number
        position: number
        total: number
        intentSentiment: IntentSentimentResult | null
        knowledge: KnowledgeResult | null
        coaching: CoachingSuggestion | null
        escalation: EscalationResult | null
        frustrationLevel: number | null
      }
    }
  | { type: 'REPLAY_ERROR'; message: string }
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
        // BUG FIX (was: state.turnCount + 1): the backend assigns
        // agent turn_index = N and customer turn_index = N + 1 (see
        // simulator_agent.py). The next agent message must start at
        // customerTurnIndex + 1, not turnCount + 1 — otherwise round
        // (N+1)'s agent message reuses the same turn_index as round
        // N's customer message, causing duplicate turn labels in the
        // Reports/Summary Agent's sentiment journey.
        turnCount: customerTurnIndex + 1,
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

    case 'MANUAL_TURN_SUCCESS': {
      // Manual mode: one pasted customer message = one turn. No agent
      // bubble is created here — the agent's real reply happens outside
      // Clario (in whatever live channel they're actually supporting the
      // customer through). Clario's job in this mode is purely to analyze
      // the real customer message and surface coaching + escalation.
      const {
        customerMessage,
        turnIndex,
        intentSentiment,
        knowledge,
        coaching,
        escalation,
        frustrationLevel,
      } = action.payload

      const customerMsg: ChatMessage = {
        role: 'customer',
        content: customerMessage,
        turnIndex,
        intentSentiment,
        knowledge,
        frustrationLevel,
      }

      const historyEntry: EscalationHistoryEntry = escalation
        ? { turnIndex, escalation, timestamp: new Date().toISOString() }
        : {
            turnIndex,
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
        messages: [...state.messages, customerMsg],
        latestIntentSentiment: intentSentiment,
        latestKnowledgeResults: knowledge,
        latestCoachingSuggestion: coaching,
        latestEscalation: escalation,
        escalationHistory: [...state.escalationHistory, historyEntry],
        turnStatus: 'idle',
        turnCount: state.turnCount + 1,
      }
    }

    case 'REPLAY_LOADED':
      return {
        ...state,
        replayTotal: action.total,
        replayPosition: 0,
        replayDone: false,
      }

    case 'REPLAY_STEP_SUCCESS': {
      const {
        role,
        content,
        turnIndex,
        position,
        total,
        intentSentiment,
        knowledge,
        coaching,
        escalation,
        frustrationLevel,
      } = action.payload

      // Nothing left to step through — just refresh position/done state.
      if (!content) {
        return {
          ...state,
          replayPosition: position,
          replayTotal: total,
          replayDone: position >= total,
          turnStatus: 'idle',
        }
      }

      const newMsg: ChatMessage = {
        role,
        content,
        turnIndex,
        intentSentiment,
        knowledge,
        frustrationLevel,
      }

      const historyEntry: EscalationHistoryEntry | null =
        role === 'customer' && escalation
          ? { turnIndex, escalation, timestamp: new Date().toISOString() }
          : null

      return {
        ...state,
        messages: [...state.messages, newMsg],
        latestIntentSentiment: intentSentiment ?? state.latestIntentSentiment,
        latestKnowledgeResults: knowledge ?? state.latestKnowledgeResults,
        latestCoachingSuggestion: coaching ?? state.latestCoachingSuggestion,
        latestEscalation: escalation ?? state.latestEscalation,
        escalationHistory: historyEntry
          ? [...state.escalationHistory, historyEntry]
          : state.escalationHistory,
        replayPosition: position,
        replayTotal: total,
        replayDone: position >= total,
        turnStatus: 'idle',
      }
    }

    case 'REPLAY_ERROR':
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
  // Milestone 3: Manual mode — submit a pasted REAL customer message.
  submitManualMessage: (customerMessage: string) => Promise<void>
  // Milestone 3: Replay mode — upload a transcript, then step through it.
  uploadReplayTranscript: (file: File) => Promise<void>
  advanceReplay: () => Promise<void>
  endSession: () => void
  loadExistingSession: (sessionId: string) => Promise<void>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

// ─── Helpers ──────────────────────────────────────────────────────

function mapCoaching(raw: any): CoachingSuggestion | null {
  if (!raw) return null
  const coachingTips = raw.coaching_tips?.length
    ? raw.coaching_tips
    : (raw.communication_tips ?? [])
  return {
    coaching_tips: coachingTips,
    suggested_response: raw.suggested_response ?? '',
    tone_feedback: raw.tone_feedback,
    communication_tips: raw.communication_tips,
    confidence: raw.confidence,
  }
}

function mapEscalation(raw: any): EscalationResult | null {
  if (!raw) return null
  const riskValue = typeof raw.escalation_risk === 'number' ? raw.escalation_risk : 0
  return {
    escalation_risk: riskValue,
    risk_level: raw.risk_level ?? 'low',
    reasoning: raw.reasoning ?? [],
    recommended_action: raw.recommended_action,
    alert_triggered: raw.alert_triggered ?? (raw.risk_level === 'high'),
    score: riskValue,
  }
}

// ─── Provider ─────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const value = useMemo<SessionContextValue>(() => {
    return {
      ...state,

      // ── startSession: create a new session + (Simulator only) start the simulator ──
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

          let threadId = ''
          let firstMessages: ChatMessage[] = []

          if (config.mode === 'Simulator') {
            // 2. Start the simulator and get the first customer message.
            // Manual/Replay modes never call this — there is no AI-generated
            // welcome message in either: Manual starts empty until the agent
            // pastes the first real customer message; Replay starts empty
            // until a transcript is uploaded and stepped through.
            const simResult = await startSimulator({
              session_id: sessionId,
              mode: config.mode,
              product_context: config.product_context,
              scenario: config.scenario,
              persona: config.persona,
            })
            threadId = simResult.thread_id

            const firstMsg = simResult.messages[0]
            firstMessages = firstMsg
              ? [{
                  role: 'customer',
                  content: firstMsg.content,
                  turnIndex: firstMsg.turn_index,
                }]
              : []
          } else {
            threadId = `local-${Date.now()}`
          }

          dispatch({
            type: 'SESSION_STARTED',
            sessionId,
            threadId,
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

      // ── submitTurn: single full-pipeline call per turn (Simulator mode) ──
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

          dispatch({
            type: 'TURN_SUCCESS',
payload: {
              agentMessage: trimmed,
              agentMessageTempId: tempId,
              customerMessage,
              customerTurnIndex,
              intentSentiment: res.intent_sentiment ?? null,
              knowledge: res.knowledge ?? null,
              coaching: mapCoaching(res.coaching),
              escalation: mapEscalation(res.escalation),
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

      // ── submitManualMessage: Manual mode — one pasted REAL customer
      // message = one turn. Reuses conversationTurn() with mode="Manual";
      // the backend persists this text as role="customer" (not "agent")
      // and runs the same coaching pipeline on it. ──
      async submitManualMessage(customerMessage: string) {
        if (!state.isSessionActive || !state.sessionId) {
          console.warn('[SessionContext] submitManualMessage ignored — no active session')
          return
        }

        const trimmed = customerMessage.trim()
        if (!trimmed) {
          console.warn('[SessionContext] submitManualMessage ignored — empty message')
          return
        }

        dispatch({ type: 'TURN_PENDING' })

        try {
          const res = await conversationTurn({
            session_id: state.sessionId,
            mode: 'Manual',
            product_context: state.productContext,
            scenario: state.scenario,
            persona: state.persona,
            user_message: trimmed,
            turn_index: state.turnCount,
          })

          const customerSim = res.customer_simulation ?? {}
          const turnIndex = res.turn_index ?? customerSim.turn_index ?? state.turnCount

          dispatch({
            type: 'MANUAL_TURN_SUCCESS',
            payload: {
              customerMessage: customerSim.customer_message || trimmed,
              turnIndex,
              intentSentiment: res.intent_sentiment ?? null,
              knowledge: res.knowledge ?? null,
              coaching: mapCoaching(res.coaching),
              escalation: mapEscalation(res.escalation),
              frustrationLevel: customerSim.internal_frustration_level ?? null,
            },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Manual turn failed'
          dispatch({ type: 'TURN_ERROR', message: msg })
          throw new Error(msg)
        }
      },

      // ── uploadReplayTranscript: Replay mode — parse + store a transcript
      // against the active session, resetting the step position to 0. ──
      async uploadReplayTranscript(file: File) {
        if (!state.sessionId) {
          console.warn('[SessionContext] uploadReplayTranscript ignored — no active session')
          return
        }
        try {
          const res = await apiUploadReplayTranscript(state.sessionId, file)
          dispatch({ type: 'REPLAY_LOADED', total: res.total_turns })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to upload transcript'
          dispatch({ type: 'REPLAY_ERROR', message: msg })
          throw new Error(msg)
        }
      },

      // ── advanceReplay: Replay mode — step to the next line in the
      // uploaded transcript. Customer lines run the full coaching pipeline;
      // agent lines are just replayed as context. ──
      async advanceReplay() {
        if (!state.sessionId) {
          console.warn('[SessionContext] advanceReplay ignored — no active session')
          return
        }

        dispatch({ type: 'TURN_PENDING' })

        try {
          const res = await replayNext(state.sessionId)

          dispatch({
            type: 'REPLAY_STEP_SUCCESS',
            payload: {
              role: res.role ?? 'customer',
              content: res.content ?? '',
              turnIndex: res.turn_index,
              position: res.position,
              total: res.total_turns,
              intentSentiment: res.intent_sentiment ?? null,
              knowledge: res.knowledge ?? null,
              coaching: mapCoaching(res.coaching),
              escalation: mapEscalation(res.escalation),
              frustrationLevel: res.customer_simulation?.internal_frustration_level ?? null,
            },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to advance replay'
          dispatch({ type: 'REPLAY_ERROR', message: msg })
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

          let threadId = ''
          let firstMessages: ChatMessage[] = []

          if (sessionDetail.mode === 'Simulator') {
            const simResult = await startSimulator({
              session_id: sessionDetail.session_id,
              mode: sessionDetail.mode,
              product_context: sessionDetail.product_context,
              scenario: sessionDetail.scenario,
              persona: sessionDetail.persona,
            })
            threadId = simResult.thread_id

            const firstMsg = simResult.messages[0]
            firstMessages = firstMsg
              ? [{
                  role: 'customer',
                  content: firstMsg.content,
                  turnIndex: firstMsg.turn_index,
                }]
              : []
          } else {
            threadId = `local-${Date.now()}`
          }

          dispatch({
            type: 'SESSION_STARTED',
            sessionId: sessionDetail.session_id,
            threadId,
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
# Milestone 3 — Frontend Session-Persistence Refactor Log

## Goal
Fix the state lifecycle bug where session data lived in `useState` inside
`LiveConsole.tsx` and was lost on every route change. The fix lifts all session
state into a global React Context (`SessionContext`) that survives navigation,
so the Live Console, Coaching Feed, and Escalation Alerts all read the **same**
live session.

## Approach (Approved Option A)
- `submitTurn()` now calls the backend **once** per turn via `POST /api/conversation/turn`
  (the full-pipeline endpoint), instead of opening an SSE/EventSource stream.
- The customer "typing" effect is now rendered **client-side** with a lightweight
  word-by-word typewriter effect over the complete returned message.
- `turnCount` is tracked as its **own** state field (incremented once per
  successful turn), NOT derived from `messages.length` (which grows by 2 per turn).
- The real `product_context`, `scenario`, and `persona` are captured at
  start/load time and passed into every `conversationTurn` call, because the
  backend handler does **not** fall back to the stored session config.
- `turnStatus` (`"idle" | "pending" | "error"`) drives button disable states,
  the "AI Generating..." indicator, and a visible non-silent error banner.

## Files Changed

| File | Change |
|------|--------|
| `src/context/SessionContext.tsx` | **New.** Global session reducer/context with `startSession`, `submitTurn`, `endSession`, `loadExistingSession`. Holds `sessionId`, `threadId`, `sessionMode`, `productContext`, `scenario`, `persona`, `messages`, `latestIntentSentiment`, `latestKnowledgeResults`, `latestCoachingSuggestion`, `latestEscalation`, `escalationHistory`, `turnStatus`, and `turnCount`. Persists across route navigation. |
| `src/services/api.ts` | Widened `ConversationTurnResponse` type to include `coaching` (`tone_feedback`, `communication_tips`, `confidence`) and `escalation` (`reasons`, `recommended_action`, `alert_triggered`) fields. |
| `src/App.tsx` | Wrapped the entire page tree (TopNav + Routes) with `<SessionProvider>` so all child pages share one session instance. |
| `src/pages/LiveConsole.tsx` | Migrated from local `useState` to `useSession()`. Removed SSE/`EventSource` + `getSimulatorStreamUrl` usage. `handleSendMessage` now calls `submitTurn()` once. Added client-side typewriter effect and `turnStatus` handling. Kept page-local UI-only state (form fields, session mode toggle, reply input, loading/error). |
| `src/pages/CoachingFeedPlaceholder.tsx` | Reads the **live** `latestCoachingSuggestion` from context instead of static skeletons. Shows an "Awaiting first turn" state and a live badge. |
| `src/pages/EscalationAlertsPlaceholder.tsx` | Reads the **live** `latestEscalation` + `escalationHistory` from context. Renders real risk level, score, and reasoning per turn; shows live badge and empty states. |
| `MILESTONE3_FRONTEND_LOG.md` | **This file.** |

## Key Design Decisions

1. **Single `conversationTurn` call, client-side typewriter**
   The backend `/api/conversation/turn` endpoint returns the complete customer
   simulation message plus pipeline analytics in one response. Streaming via SSE
   is no longer used; a CSS/JS word-reveal animation provides the "typing" feel
   with zero extra network requests.

2. **`turnCount` is independent, not `messages.length`**
   Each successful turn appends **two** messages (agent + customer). Deriving the
   turn index from array length would double-count. `turnCount` increments once
   per `TURN_SUCCESS`.

3. **Explicit config pass-through**
   `startSession`/`loadExistingSession` store the chosen `mode`, `product_context`,
   `scenario`, and `persona`. `submitTurn` forwards those exact values to the
   backend, since the backend's `conversation_turn` handler passes them straight
   into the pipeline (no server-side fallback).

4. **`turnStatus` surfaced, not silent**
   On a failed turn, `TURN_STATUS` is set to `"error"` and a visible banner is
   shown in the Live Console ("This turn failed to process"). The send button is
   disabled during `"pending"`.

5. **Session cleared only on explicit End Session**
   `endSession()` dispatches `SESSION_ENDED` which resets to `INITIAL_STATE`.
   Normal route navigation preserves the session because state lives in the
   provider above the routes.

## Verification
- `npx tsc --noEmit` passes cleanly (exit 0) after each task commit.
- Commits (in order):
  1. `4bda9a3` — task 2: SessionContext with turnCount fix and config persistence
  2. `1cb797d` — task 3: wrap app with SessionProvider
  3. `6ab3869` — task 4: migrate LiveConsole to SessionContext, drop SSE, add client-side typewriter + turnStatus
  4. `72bda20` — task 5: wire CoachingFeed + EscalationAlerts placeholders to live SessionContext

## Out of Scope / Not Touched
- No backend files were modified.
- `ReportsPlaceholder`, `AnalyticsDashboardPlaceholder`, `LiveConsolePlaceholder`,
  `Home`, `SessionConfig`, and `KnowledgeBaseUpload` were left as-is unless
  required by the context wiring.

## Notes for Further Work (Milestone 3 / 4)
- The backend still returns mostly mock `coaching` / `escalation` output (pipeline
  stubs). The frontend is ready to render the real fields once the backend agents
  (`coaching_agent`, `escalation_agent`) are implemented.
- The typewriter animates the first (welcome) customer message on mount too —
  intentional and matches the previous "Customer Typing" preview behavior.


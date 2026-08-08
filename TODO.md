# Milestone 3 — Remaining Work Tracker

Order (mandatory per instructions): Bug A → Bug B → Task 3 → 4 → 5 → 6 → 7. One commit per numbered task; report hash each time.

## Tasks

- [x] **Task 1 (Bug B)**: Remove dead SSE read-path + "I need assistance." fallback in `simulator.py` so real customer message comes from pipeline. Commit `95a7a02`.
- [ ] **Task 2 (Bug A)**: Harden SessionContext `loadExistingSession`/`getSession` to use fetched session detail as source of truth (avoid stale display). Commit.
- [ ] **Task 3**: Build real `coaching_agent.py` (Gemini). Full overwrite. Strict JSON: suggested_response, tone_feedback, communication_tips[1-3], confidence(0-1). `_safe_run_agent()`-pattern fallback only on API error. Commit.
- [ ] **Task 4**: Build real `escalation_agent.py` (Gemini). Full overwrite. Strict JSON: escalation_risk(0-1), risk_level low/med/high, reasoning, recommended_action, alert_triggered(true when high). Runs every turn. Commit.
- [ ] **Task 5**: Wire Stage 4 Coaching + Stage 5 Escalation into `pipeline.py` (diff), wrapped in `_safe_run_agent()`. Verify real JSON via test call. Commit.
- [ ] **Task 6**: `LiveConsole.tsx` (diff) — TWO separate panels (Coaching + Escalation) in bottom grid, live from `useSession()`. Coaching: suggested_response + "Use this reply" button (fills input, no auto-send), tone_feedback, tips. Escalation: risk_level color indicator, reasoning, recommended_action, warning state if alert_triggered. Empty states match existing pattern. Don't touch CoachingFeed/EscalationAlerts pages. Run `npx tsc --noEmit`. Commit.
- [ ] **Task 7**: End-to-end verify — 3-4 turns; show real session doc (Bug A fixed), real messages docs (Bug B fixed), real coaching+escalation JSON for ≥2 distinct turns (dynamic, not canned), both panels update live. Commit.

## Notes
- Do NOT touch `simulator_agent.py` or `intent_sentiment_agent.py`.
- Diff-edits to existing files; full overwrite only for brand-new/brand-new-ish files.
- Constraints: `npx tsc --noEmit` (frontend) after Task 6; backend compile/test after backend tasks.
- Clean up temporary `debug_inspect_db.py` at the end.

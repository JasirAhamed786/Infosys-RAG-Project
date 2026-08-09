# Bug-Fix Pass — Tracking

Fix order: Bug 1 → Bug 2 → Bug 3 → Bug 4, then resume paused UI polish task.

## Bug 1 — Escalation risk_level "High" but score "1/100" (DONE — commit 86a5cb1)
- [x] Fix backend escalation_agent.py: derive risk_level from numeric score server-side, scale escalation_risk to 0-100.
- [x] Test: trigger high frustration, confirm score and risk_level agree (e.g. "81/100" + "High").
- [x] Commit.

## Bug 2 — Chat force-scrolls to bottom on every render (DONE — commit 4149317)
- [x] Fix LiveConsole.tsx: "stick to bottom" — only auto-scroll on new message append when user was near bottom.
- [x] Test: scroll up mid-conversation stays put; send at bottom still auto-scrolls.
- [x] Commit.

## Bug 3 — Agent's own message only appears after full pipeline (DONE — commit 2faeb52)
- [x] Add AGENT_MESSAGE_SENT optimistic action in SessionContext.tsx.
- [x] Reconcile in TURN_SUCCESS (no duplicate agent message); handle TURN_ERROR marker.
- [x] LiveConsole.tsx: dispatch optimistic on send, clear input immediately.
- [x] Test: send a message, confirm it appears instantly.
- [x] Commit.

## Bug 4 — Simulator writes paragraphs, not short casual texts (DONE — commit 4a219c6)
- [x] Edit simulator_agent.py prompt text only (short/casual/imperfect, preserve frustration/persona).
- [x] Test: generate 5-6 sample messages across frustration levels, confirm realistic short texts.
- [x] Commit.

## Resume paused UI polish task (Task 2 onward)
- [ ] Confirm remaining scope with user.
- [ ] Apply polish.
- [ ] Commit.

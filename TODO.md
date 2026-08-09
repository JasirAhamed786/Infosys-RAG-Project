# Task: Fix Live Console freeze + latency, and redesign coaching/escalation UI

## Part A — Backend performance (keep versatile models)
- [x] Parallelize pipeline agent stages (`backend/app/orchestration/pipeline.py`)
- [x] Fast-track `start_simulator` to call simulator agent directly (`backend/app/routers/simulator.py`)

## Part B — Frontend stability
- [x] Defensive remount reset for typewriter state in `LiveConsole.tsx` (nav-return freeze)

## Part C — Professional UI
- [x] Redesign `CoachingFeedPlaceholder.tsx`
- [x] Redesign `EscalationAlertsPlaceholder.tsx`

## Verification
- [x] Backend Python syntax check


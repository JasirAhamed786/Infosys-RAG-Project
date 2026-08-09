# UI/UX Overhaul — Clario Dashboard (Visual Only)

Scope: Frontend `src/**` ONLY. No backend files touched. No data/logic/API changes.
Analytics page = RESTYLE-ONLY (zero structural changes).

## Task 1 — Audit (DONE)
- [x] Read all frontend pages/components/styles
- [x] Report styled per audit (see chat transcript)
- [x] Confirmed no backend files read

## Task 2 — Global design system (DONE)
- [x] tailwind.config.js: add palette + spacing + font tokens
- [x] styles.css: flatten .app-bg / .glass to flat token surfaces
- [x] index.html: add Inter + JetBrains Mono fonts
- [x] App.tsx: restyle shared hero/header wrapper (layout only, no routing logic)
- [x] `npm run build` passes
- [x] Commit

## Task 3 — Navigation (TopNav.tsx) (DONE)
- [x] Single accent active state (subtle underline/tint), inactive lower-contrast
- [x] Keep tab order/labels identical
- [x] Optional persistent "Session Active" indicator
- [x] `npm run build` passes
- [x] Commit

## Task 4 — Live Console (highest detail) (DONE)
- [x] 4-panel grid token restyle, normalized borders/spacing (rounded-[8px], #E4E7EC)
- [x] Escalation signature risk-indicator treatment (risk colors tokenized on frustration/level)
- [x] Chat bubbles restyled (customer/agent distinction kept)
- [x] Remove outdated LOCKED/Coming Soon copy (M3 live)
- [x] turnStatus pending/error calm treatment
- [x] Responsive: 4-panel grid stacks on narrow viewport (lg:h-[600px] min-h-[480px])
- [x] `npm run build` passes
- [x] Commit

## Task 5 — Session Config, KB Upload, Coaching Feed, Escalation Alerts (DONE)
- [x] Apply token system to all four
  - [x] SessionConfig.tsx (removed empty header pill, removed dev-facing "maps to backend" filler)
  - [x] KnowledgeBaseUpload.tsx (indigo → single accent, removed backend-format filler + dev Tip line)
  - [x] CoachingFeedPlaceholder.tsx (M3 badge → Live, gradient empty state flattened)
  - [x] EscalationAlertsPlaceholder.tsx (M3 badge → Live, signature left-border risk treatment)
  - [x] ComingSoonBase.tsx (shared chrome for reports/analytics tokenized)
  - [x] ReportsPlaceholder.tsx (M4 coming-soon skeleton tokenized, structure intact)
- [x] Remove scaffold/placeholder visual language (these read live data)
- [x] Restyle empty states (consistent icon + muted tone)
- [x] `npm run build` passes
- [x] `npx tsc --noEmit` passes
- [x] Commit 77e27aa

## Task 6 — Analytics page (RESTYLE ONLY, hard constraint) (DONE)
- [x] Token colors/spacing/typography/borders on existing children (header/badge via ComingSoonBase)
- [x] No add/remove/reorder/restructure — only class-value swaps in place
- [x] Report what changed; confirm nothing restructured
- [x] `npm run build` passes
- [x] `npx tsc --noEmit` passes
- [x] Commit c6ab79a

## Final
- [x] Confirm functionality (start session, turn, navigation) unchanged (style-only; no props/state/API touched)
- [x] Confirm no backend files touched (only frontend/src/** + index.html + package.json read/edited)

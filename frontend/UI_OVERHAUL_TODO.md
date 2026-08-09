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

## Task 5 — Session Config, KB Upload, Coaching Feed, Escalation Alerts
- [ ] Apply token system to all four
- [ ] Remove scaffold/placeholder visual language (these read live data)
- [ ] Restyle empty states (consistent icon + muted tone)
- [ ] `npm run build` passes
- [ ] Commit

## Task 6 — Analytics page (RESTYLE ONLY, hard constraint)
- [ ] Token colors/spacing/typography/borders on existing elements only
- [ ] No add/remove/reorder/restructure
- [ ] Report what changed; confirm nothing restructured
- [ ] `npm run build` passes
- [ ] Commit

## Final
- [ ] Confirm functionality (start session, turn, navigation) unchanged
- [ ] Confirm no backend files touched

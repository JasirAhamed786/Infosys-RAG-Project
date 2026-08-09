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

## Task 3 — Navigation (TopNav.tsx)
- [ ] Single accent active state (subtle underline/tint), inactive lower-contrast
- [ ] Keep tab order/labels identical
- [ ] Optional persistent "Session Active" indicator
- [ ] `npm run build` passes
- [ ] Commit

## Task 4 — Live Console (highest detail)
- [ ] 4-panel grid token restyle, normalized borders/spacing
- [ ] Escalation signature risk-indicator treatment
- [ ] Chat bubbles restyled (customer/agent distinction kept)
- [ ] Remove outdated LOCKED/Coming Soon copy (M3 live)
- [ ] turnStatus pending/error calm treatment
- [ ] Responsive: 4-panel grid stacks on narrow viewport
- [ ] `npm run build` passes
- [ ] Commit

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

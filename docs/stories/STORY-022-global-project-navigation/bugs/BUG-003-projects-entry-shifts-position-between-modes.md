---
id: BUG-003
story: STORY-022
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-003: Global Projects top-bar entry shifts position when switching between Task Manager and Sessions mode

## Description
The description.md edge case states: "Switching between Task Manager mode and
Sessions mode does not hide or move the global Projects entry — its position
and behavior are identical in both modes." In practice, the "Projects" entry's
horizontal position changes measurably when the sibling "Config" (Settings)
button disappears in Sessions mode — the right-aligned top-bar group shrinks
and the "Projects" entry moves to occupy the space the Settings button used
to fill.

## Steps to Reproduce
1. Navigate to `/projects/:id/stories` (Task Manager mode), desktop viewport (~1512px wide in this session).
2. Note the "Projects" link's horizontal position (measured via `getBoundingClientRect()`: x = 1306.6px).
3. Switch to Sessions mode via the app-mode switcher combobox.
4. Re-measure the "Projects" link's position (x = 1398.2px).
5. Switch back to Task Manager mode — position returns to x = 1306.6px, confirming the shift is reproducible and tied directly to mode switching.

## Expected Result
The "Projects" entry's on-screen position stays identical between Task Manager and Sessions modes; only the presence of the neighboring Settings button changes.

## Actual Result
The "Projects" entry shifts ~92px to the right when switching from Task Manager mode to Sessions mode (and back when switching back), because it is part of a right-aligned flex group whose total width shrinks once the Settings button is removed.

## Additional Info
- Screenshots: `docs/qa/results/STORY-022-evidence/tc-006-sessions-mode-shifted.png` (Sessions mode, shifted position) vs `docs/qa/results/STORY-022-evidence/tc-003-task-manager-mode-baseline.png` (Task Manager mode, baseline position).
- Measured via `browser_evaluate` calling `getBoundingClientRect()` on `a[href="/projects"]` in both modes, at ambient viewport width 1512px.
- Found while executing tc-006 (`docs/stories/STORY-022-global-project-navigation/test-cases/tc-006-mode-switch-position-stable.md`).
- Classified `minor` per qa-strategy (visible positional shift, does not block navigation — the entry is still clickable and lands on `/projects` in both modes) — however this is an explicit, deliberately written edge case in `description.md`, not a stylistic nitpick, so please re-triage if the team judges differently.
- Independently corroborated by `manual-qa` during the BUG-002 investigation (see that bug file's "Additional Info" section), which measured the same ~92px shift while ruling out an unrelated symptom.

## Fix

Root cause confirmed: in `frontend/src/app/TopBar.tsx`, the "Projects" `NavLink` and the "Config" (Settings) `button` share one `flex` group inside a `justify-between` header row. That group is anchored to the header's right edge; the Settings button was previously only rendered at all in Task Manager mode (`{mode === "task-manager" && (...)}`), so removing it in Sessions mode shrank the group's total width and pulled its left edge — and therefore the Projects link, which sits before Settings in the group — to the right.

Fix: the Settings button is now always mounted, in both modes, so the flex group's width — and the Projects link's position — never changes between modes. Outside Task Manager mode it is:
- visually hidden via Tailwind's `invisible` utility (`visibility: hidden`), which keeps its layout box (preserving the group's width) while removing it from the accessible/screen-reader tree and from the tab order
- `disabled`, so it cannot be activated by any residual pointer/keyboard interaction

This keeps the Settings button functionally gated to Task Manager mode only (per the story's explicit scope — not visible, not focusable, not clickable in Sessions mode) while making the Projects entry's on-screen position identical in both modes, satisfying the edge case in `description.md`.

**Code location**: `frontend/src/app/TopBar.tsx`
**Verification**: `npm run build` (includes `tsc --noEmit`) passes; compiled CSS confirms `.invisible { visibility: hidden }` is emitted for the Settings button's hidden state.

## Follow-up correction (2026-07-21)

The original fix above verified only with `npm run build`, not the test suite — this left a real regression in place: `frontend/src/app/TopBar.test.tsx` had two pre-existing assertions (`"hides the Settings button in Sessions mode"` and `"keeps the Settings button hidden while the global Projects entry stays visible in Sessions mode"`) that query with `screen.queryByRole("button", { name: "Go to Config" })` and assert `.not.toBeInTheDocument()`. Once the Settings button became always-mounted (this fix), those queries still find it in the DOM — `visibility: hidden` via the compiled `.invisible` class is real in a browser, but jsdom (the test environment) does not compute Tailwind's compiled CSS, so the button is not filtered out by CSS alone. This was flagged in BUG-004's own verification note ("2 pre-existing failures ... unrelated to this change") but never actually fixed.

Fix: added `aria-hidden={mode !== "task-manager"}` to the Settings button, alongside the existing `disabled` and `invisible` class. `aria-hidden="true"` is an attribute-based accessibility signal — Testing Library's `getByRole`/`queryByRole` exclude elements with `aria-hidden="true"` from the accessible role tree regardless of CSS support, so this makes the button correctly invisible to both real screen readers (browser) and role queries (jsdom) without changing its layout box (the `invisible` class still preserves the flex group's width, so the original BUG-003 position-shift fix is unaffected).

**Code location**: `frontend/src/app/TopBar.tsx`
**Verification**: `npx vitest run` — 213 passed / 0 failed (previously 211 passed / 2 failed); `npm run build` passes; compiled CSS still emits `.invisible{visibility:hidden}` and `.z-\[110\]{z-index:110}` unchanged.

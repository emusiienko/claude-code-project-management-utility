---
id: BUG-003
story: STORY-022
severity: minor
status: open
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

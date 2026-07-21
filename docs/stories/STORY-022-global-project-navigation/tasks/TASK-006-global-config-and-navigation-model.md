---
status: ToDo
assignee: frontend-developer
story: STORY-022
---

# TASK-006: Global Config entry + main-view/closable-view navigation model

## What to implement
Establish the navigation model in which the app has two **main views** (Task
Manager and Sessions) and two **closable views** (Projects management, system
Config), and make Config a global top-bar entry.

Three parts:

1. **Config becomes a global top-bar entry.** Config is a persistent,
   always-visible, active-aware entry in the top bar in both main views,
   sitting beside the Projects entry and using the same active-page indication
   (`aria-current="page"` on the Config route) and keyboard focus treatment
   Projects already uses. Retire the mounted-but-hidden placeholder that kept
   Config in the layout only to hold position in Sessions — two always-present
   entries hold their positions by construction.

2. **Main-view vs closable-view classification.** Introduce a single source of
   truth that classifies the current route as a main view (Task Manager routes,
   Sessions) or a closable view. The closable views are `/projects` (Projects
   management) and `/settings` (system Config). Everything else that the top bar
   sits above is a main view.

3. **Record the last active main view + reflect it in the app-switcher.** From
   an always-mounted component, record the full main-view URL (path + query) on
   every route change to a main view, using the same browser-local-storage
   approach that already records the last Task Manager URL. Skip the
   closable-view routes when recording, so opening Projects or Config never
   overwrites the return target. While a closable view is open, the
   app-switcher reflects the underlying main view derived from that recorded
   URL (so opening Config or Projects from Sessions keeps the switcher on
   Sessions), and switching the app-switcher to the other main navigates there.

This task provides the recorded "last main view" value and the classification
for TASK-007 to consume; it does not change the Projects/Config pages' own back
affordances (that is TASK-007).

## Scope
Top bar and root-layout navigation chrome; a small shared navigation-model
utility for the main-vs-closable classification and the last-main-view record.
Frontend only — no backend, API contract, or data-model change. The Config
entry points at the existing `/settings` screen; what that screen shows is
unchanged.

## Dependencies
None (the earlier STORY-022 tasks it refines are already Done).

## Acceptance Criteria
- [ ] The Config entry is visible and interactive in both Task Manager mode and Sessions mode, beside the Projects entry
- [ ] The Config entry shows active/current-page indication when on the Config route and is keyboard-accessible with a visible focus indicator, consistent with the Projects entry
- [ ] The Projects and Config entries keep the same on-screen position when switching between Task Manager and Sessions mode
- [ ] A single classification identifies `/projects` and `/settings` as closable views and all other top-bar routes (Task Manager routes and Sessions) as main views
- [ ] The last main-view URL (path + query) is recorded on main-view route changes and is not overwritten when a closable view is open
- [ ] While a closable view is open, the app-switcher reflects the underlying main view (the one recorded), and selecting the other main navigates there
- [ ] `npx tsc --noEmit` passes and the existing suite runs (test re-alignment for the inverted Config gating is handled in TASK-008)

## Supersedes (in part)
- TASK-001's Config gating (Config was Task-Manager-only) — now global.
- BUG-003's mounted-but-hidden placeholder position fix — no longer needed with two always-present entries.
Leave TASK-001's and the BUG-003 report as the historical record; do not edit them.

## Intended ADR
None. Navigation UX extending patterns already in the app (`NavLink` active
state, the existing last-URL local-storage record); no ecosystem choice, no
hard-to-reverse or non-obvious trade-off.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

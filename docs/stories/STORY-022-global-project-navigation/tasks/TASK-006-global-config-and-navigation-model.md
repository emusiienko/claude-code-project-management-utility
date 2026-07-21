---
status: Done
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
**Date**: 2026-07-21

**What was done**:
- Introduced a single-source-of-truth navigation-model utility classifying every route as a main view or a closable view: `/projects`, `/settings`, and the standalone Project Settings sub-page (`/projects/:projectId/settings`) are closable; every other top-bar route (Task Manager routes and `/sessions`) is a main view.
- Made Config a persistent, always-visible, active-aware top-bar entry in both Task Manager and Sessions modes, matching the Projects entry's `NavLink` `end` → `aria-current="page"` active-state and `focus-visible` treatment. Retired the mounted-but-hidden/disabled placeholder button (BUG-003's position-stabilisation hack) — both entries are now unconditionally rendered `NavLink`s, so they hold their on-screen position by construction with no visibility/disabled toggling needed.
- Extracted a private `TopBarNavLink` sub-component inside `TopBar.tsx` so Projects and Config share one implementation of the active-state/focus-ring contract instead of duplicating the className logic.
- Added an always-mounted recording hook (`useLastMainViewUrl`, built on a new generic `useLastVisitedUrl` primitive) that persists the current main-view URL (path + query) to localStorage on every main-view route change, skipping all closable-view routes so opening Projects or Config never overwrites the return target. This is the record TASK-007 will consume for "close returns to last main view."
- Reworked the app-switcher's mode derivation: on a main-view route the mode is derived directly from the pathname (unchanged); on a closable-view route the mode is derived from the recorded last-main-view URL instead (falling back to Task Manager when nothing has been recorded yet), so the switcher reflects the underlying main view rather than flipping to whatever the closable view happens to be. The existing "switch to Task Manager" behavior now reads from a narrower, explicitly Task-Manager-scoped last-visited-URL record (see Technical decisions) so it isn't polluted by Sessions visits.

**Deviations from plan**:
- None from the task's stated scope. As explicitly anticipated by this task's own acceptance criteria ("test re-alignment for the inverted Config gating is handled in TASK-008"), two pre-existing `TopBar.test.tsx` assertions now fail because they assert Config-was-Task-Manager-only behavior that this task intentionally inverted, and one other assertion (`getByRole("button", { name: "Go to Config" })`) fails because Config is now rendered as a `NavLink` (`role="link"`) rather than a plain `<button>`, matching the active-state requirement in this task's AC. Per the plan, these are left for TASK-008 (qa-automation) to re-align rather than fixed here — the test file is qa-automation's artifact per the pipeline's task split, and rewriting its assertions here would pre-empt that task. Full baseline/post-implementation test results are below.

**Technical decisions made**:
- Kept two distinct localStorage records rather than collapsing to one: the broad "last main view" (`app:last_main_view_url`, both Task Manager and Sessions, closable views excluded) used for the app-switcher's underlying-main derivation and for TASK-007's close target; and the narrower pre-existing "last Task-Manager-mode view" (`app:last_task_manager_url`, Sessions and closable views excluded) still needed by the explicit "switch to Task Manager" combobox action, since that action must return to the last Task-Manager route specifically, not to whichever main view happens to be currently recorded (which could itself be `/sessions`). Both are backed by the same new generic `useLastVisitedUrl(key, shouldRecord)` hook to avoid duplicating the localStorage-recording logic.
- Classified the standalone Project Settings screen (`/projects/:projectId/settings`) as a closable-view route for recording/mode-derivation purposes (not just `/projects` and `/settings` verbatim), per the plan's explicit constraint that this URL must be skipped by the last-main-view record. Its own back-link target (fixed to `/projects`) is unchanged and out of this task's scope (TASK-007).

**Code locations**:
- `frontend/src/shared/utils/navigationModel.ts` (new) — `AppMode`, `isClosableViewPath`, `isMainViewPath`, `deriveAppMode`
- `frontend/src/shared/hooks/useLastVisitedUrl.ts` (new) — generic last-visited-URL recorder
- `frontend/src/shared/hooks/useLastMainViewUrl.ts` (new) — `LAST_MAIN_VIEW_URL_KEY` + the main-view-specific recording hook, exported for TASK-007 to consume
- `frontend/src/app/TopBar.tsx` (modified) — global Config `NavLink`, shared `TopBarNavLink` sub-component, mode derivation reworked around the closable/main classification

**Technical debt noted**:
- `TopBar.test.tsx` has 2 failing assertions (of 24 in that file) after this change, both expected per this task's AC and assigned to TASK-008: `"shows the Settings button in Task Manager mode"` and `"keeps the Settings button visible alongside the global Projects entry in Task Manager mode"` — both call `getByRole("button", { name: "Go to Config" })`, which no longer matches now that Config is a `NavLink`. (A third pre-existing assertion, `"hides the Settings button in Sessions mode"`, still passes but only vacuously — it queries for a button that no longer exists in either mode.) No other regressions were introduced.

**Test results**:
- Baseline (`npx vitest run`, before this task's changes): 20 test files, 222 tests, all passing.
- Post-implementation (`npx vitest run`, after this task's changes): 20 test files, 220 passing / 2 failing (both in `TopBar.test.tsx`, both pre-identified above as expected-and-deferred to TASK-008). No other test file changed status.
- `npx tsc --noEmit`: passes with no errors.

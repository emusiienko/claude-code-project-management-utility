---
status: Done
assignee: qa-automation
story: STORY-022
---

# TASK-008: Write automated tests

## What to implement
Write automated tests covering the redesigned closable-view navigation model
(TASK-006, TASK-007), and re-align the existing top-bar tests that encode the
now-reversed "Config is Task-Manager-only" behavior. Extends the coverage from
TASK-002 and TASK-005.

**Behaviors:**
- Config entry visible and interactive in both Task Manager mode and Sessions mode
- Config entry shows active/current-page indication on the Config route and is keyboard-accessible
- Projects and Config entries hold the same on-screen position across a mode switch
- App-switcher reflects the underlying main view while a closable view is open (opening Config or Projects from Sessions keeps the switcher on Sessions; from Task Manager keeps it on Task Manager)
- Closing the Projects page returns to the recorded last main view — verify a deep Task Manager URL restores exactly, and a Sessions origin returns to Sessions
- Closing the Config page returns to the recorded last main view under the same rules
- Cold load directly into a closable view with no recorded main view: closing falls back to `/` and lands on a Task Manager destination
- Last main-view URL is recorded on main-view route changes and is not overwritten by opening a closable view

**Test re-alignment (existing coverage that now asserts the old behavior):**
- Top-bar tests asserting Config was hidden/disabled outside Task Manager mode must be updated to the global-Config behavior
- Any test asserting the mounted-but-hidden Config placeholder (BUG-003) must be updated to the two-always-present-entries behavior

**Regression guard (still-valid STORY-022 behaviors):**
- Projects entry visible in both modes
- Projects entry exact-match active state (stays inactive on `/projects/:id/settings`) — BUG-001
- Project-name click on the Projects page resolves to the standalone Project Settings screen (heading + back-link to `/projects`)
- The `⚙ Manage projects` sidebar link stays removed; sidebar project selection still lands on Stories
- Bare `/projects/:id` still redirects to Stories

## Scope
Frontend component/integration tests for the top bar, the closable-view pages'
close behavior, and the navigation-model record. No production code changes.

## Dependencies
TASK-006, TASK-007 (implementation must be complete before these tests can run green).

## Acceptance Criteria
- [ ] All listed behaviors, re-alignments, and regression guards have at least one test
- [ ] The previously-passing STORY-022 suite is updated so no test still asserts the reversed Config gating
- [ ] Tests pass against the running application (`npx vitest run` green)

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-21

**What was done**:
- Re-aligned `TopBar.test.tsx`'s Config coverage from the old Task-Manager-only gated `<button>` model to the global always-present `NavLink` model shipped by TASK-006: replaced the two stale failing assertions (`"shows the Settings button in Task Manager mode"`, `"keeps the Settings button visible alongside the global Projects entry in Task Manager mode"`) and the vacuously-passing `"hides the Settings button in Sessions mode"` / `"keeps the Settings button hidden ... in Sessions mode"` pair with a Config-entry test block mirroring the existing Projects-entry block: visible-as-link in both modes, accessible name, `href="/settings"`, `aria-current="page"` on `/settings` and absent elsewhere (both modes), and both entries visible together in both modes.
- Added a same-relative-order assertion (`getAllByRole("link")` name order) across a Task-Manager → Sessions re-render, covering the "Projects and Config entries hold the same on-screen position across a mode switch" behavior without relying on layout/pixel measurement (out of frontend-unit scope per the strategy).
- Added an app-switcher "reflects the underlying main view" test block: `/projects` opened with a recorded Task-Manager main view keeps the switcher on Task Manager; `/projects` and `/settings` opened with a recorded Sessions main view keep the switcher on Sessions; a cold `/projects` load with nothing recorded defaults to Task Manager.
- Added a last-main-view recording-invariant test block: a main-view route (`/sessions`) is recorded to `LAST_MAIN_VIEW_URL_KEY`; clicking into the Projects or Config closable-view entry from a recorded main view leaves the recorded value unchanged (not overwritten).
- Added `frontend/src/features/projects/ProjectsPage.test.tsx` (new) and extended `frontend/src/features/settings/SettingsPage.test.tsx` with matching Close-control coverage for TASK-007: renders "Close" (not "Back") with the exact accessible name; a recorded deep Task Manager URL is restored exactly; a recorded Sessions origin returns to Sessions; a cold load with nothing recorded falls back to `/` (landing on the root-redirect stub route, which the real `RootRedirect` resolves to a Task Manager destination).
- Added `frontend/src/shared/utils/navigationModel.test.ts` (new) — direct unit coverage of the classification utility underpinning both TASK-006 and TASK-007: `isClosableViewPath` (`/projects`, `/settings`, the standalone Project Settings sub-page, and the negative cases including a path with extra segments past the sub-page pattern), `isMainViewPath` as its negation, and `deriveAppMode` (`/sessions` prefix vs. everything else).
- Regression guards already present in `TopBar.test.tsx` (Projects entry in both modes, BUG-001 exact-match active state incl. the standalone Project Settings URL) and `ProjectShell.test.tsx`/`ProjectList.test.tsx`/`ProjectSettingsPage.test.tsx` (project-name → Settings landing, no Manage Projects sidebar link, bare `/projects/:id` redirect) were reviewed and left unchanged — none asserted the reversed behavior and all continue to pass.

**Deviations from plan**:
- None. The task's stated re-alignment target (2 specific failing assertions plus the third vacuously-passing one) was addressed exactly as scoped; all new coverage was additive per the listed behaviors.

**Technical decisions made**:
- Tested the Close control's navigation target (not just that `navigate()` was called with some value) by rendering `ProjectsPage`/`SettingsScreen` inside real `MemoryRouter` `Routes` with marker elements at the candidate destinations (`/projects/:projectId/board`, `/sessions`, `/`) and asserting on which marker rendered post-click — the same pattern already established by `StorySlideOver.test.tsx` for its close/breadcrumb navigation, kept for consistency rather than introducing a `useNavigate` mock.
- Imported `LAST_MAIN_VIEW_URL_KEY` directly from `useLastMainViewUrl.ts` (it's already exported for consumers) instead of re-declaring the literal string in each test file, to avoid the record drifting out of sync with the hook if the key is ever renamed.
- Used a `getAllByRole("link")` name-order comparison (not DOM position/layout) to cover the "same on-screen position across a mode switch" AC — layout assertions are explicitly out of scope per `docs/qa-automation-strategy.md` ("Visual rendering, CSS classes, layout... — manual QA covers this"); order-of-render is the closest behavior-level proxy available to a jsdom unit test.
- Left `ProjectsPage.test.tsx` and `SettingsPage.test.tsx`'s Close-control tests as thin, hook-mocked component tests (mocking `./hooks/useProjects` in the former, mocking only `SystemSettings` in the latter, matching each file's existing mocking boundary) rather than adding a dedicated `useLastMainViewUrl`/`useLastVisitedUrl` hook-unit test file — the hooks' recording/derivation behavior is already exercised end-to-end through `TopBar.test.tsx`'s recording-invariant tests and through both pages' close-navigation tests, so a third, lower-level test layer would duplicate coverage without adding signal.

**Code locations**:
- `frontend/src/app/TopBar.test.tsx` (modified) — Config-entry re-alignment, same-order regression guard, app-switcher underlying-main-view block, last-main-view recording-invariant block
- `frontend/src/features/projects/ProjectsPage.test.tsx` (new) — Close-control coverage
- `frontend/src/features/settings/SettingsPage.test.tsx` (modified) — Close-control coverage appended in a new `describe` block
- `frontend/src/shared/utils/navigationModel.test.ts` (new) — pure-function unit coverage for the classification utility

**Technical debt noted**:
- None introduced. The pre-existing Comments-feature frontend coverage gap (noted in `docs/qa-automation-strategy.md`) is unrelated and untouched by this task.

**Test results**:
- `npx vitest run`: 22 test files, 260 tests, all passing (up from the 220/2 baseline left by TASK-006/TASK-007 — the 2 known failures are now fixed by re-alignment, plus 38 new tests added across the four files).
- `npx tsc --noEmit`: passes with no errors.

---
status: Done
assignee: qa-automation
story: STORY-022
---

# TASK-011: Automated tests for the state-driven overlay navigation model

## What to implement
Write automated component tests covering the Revision 3 state-driven overlay,
and re-align the superseded expectations from TASK-002, TASK-005, and TASK-008.

**Overlay open/close over a mounted main view:**
- Clicking the top-bar Projects entry opens the Projects overlay while the
  current main-view route stays unchanged; clicking Config opens the Config
  overlay likewise.
- Dismiss clears the whole overlay and the same main view (Task Manager route,
  including a deep story/task route; and Sessions) is revealed unchanged.
- The top-bar entry shows its open/active indication only while its overlay is open.

**Back vs Dismiss and internal navigation:**
- The Projects overlay opens on the project list; choosing a project shows that
  project's Settings editor; Back returns to the list; Dismiss closes the stack
  from either level.
- Back is absent on the project list and on the single-level Config panel.
- Escape closes one overlay level per press and, when the overlay covers a Story
  slide-over / Task Detail modal, closes the overlay before them.

**Open-in-Task-Manager bridge (BUG-006):**
- From the Projects overlay, the "Open in Task Manager" action navigates the main
  view to the chosen project's Stories and dismisses the overlay, for a project
  not previously opened this session.

**App-switcher and cold start:**
- With an overlay open from Task Manager the switcher reads Task Manager; opened
  from Sessions it reads Sessions (derived from the current route, no recorded URL).
- Cold start with no projects lands on an empty Task Manager main view with the
  Projects overlay open; with a project available it lands on that project's Stories.

**Regression / still-valid STORY-022 behaviors:**
- The Manage-Projects link remains absent from the Task Manager sidebar; sidebar
  project selection and the bare-`/projects/:id` redirect still land on Stories.

**Re-align superseded suites:** update or remove assertions from TASK-002 /
TASK-005 / TASK-008 that encode route `NavLink`s, the standalone Project Settings
screen, or the last-main-view/close-to-main apparatus, so the suite is green
against the Revision 3 behavior.

## Scope
Frontend component tests (Vitest). Tests the navigation shell and the Projects/
Config overlay behavior.

## Dependencies
TASK-009, TASK-010 (implementation must be complete before tests can run green).

## Acceptance Criteria
- [ ] All listed overlay, Back/Dismiss, internal-navigation, bridge, app-switcher,
      and cold-start behaviors have at least one test.
- [ ] Superseded assertions from TASK-002 / TASK-005 / TASK-008 are re-aligned or
      removed; no test asserts the retired routing model.
- [ ] The full frontend test suite passes and the build succeeds.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-22

**What was done**:
Re-aligned the four test files TASK-009 flagged as superseded (route-based
expectations against the retired Revision-2 model) and added new coverage for
the Revision 3 state-driven overlay, closing the gap between the failing
baseline (4 files / 6 tests failing) and a fully green suite.

Realigned (rewritten in place, same files qa-automation already owns):
- `src/app/TopBar.test.tsx` — full rewrite. Projects/Config are now tested as
  `<button>` overlay triggers driven by an injected `OverlayControls` stub
  (`openProjects`/`openConfig` called on click, `aria-current` tied to
  `overlay.state.kind`, not route matching), and the app-switcher tests
  dropped all `LAST_MAIN_VIEW_URL_KEY`/`LAST_TASK_MANAGER_URL_KEY` localStorage
  assertions in favor of route-only mode derivation (switching to Sessions
  navigates to `/sessions`; switching to Task Manager navigates to `/`).
- `src/features/projects/components/ProjectList.test.tsx` — the "links the
  project name to Settings" test (asserting an `href`) was replaced with a
  test asserting the name cell is a `<button>` that calls the new
  `onSelectProject(projectId)` prop, and no `link` role exists for it.
  `onSelectProject` added to `defaultProps`.
- `src/app/RootRedirect.test.tsx` — rewritten to render `RootRedirect` under a
  stub layout that instantiates `useOverlayStack()` and supplies it via
  `<Outlet context>`, exactly like the real `RootLayout` (the previous version
  rendered `RootRedirect` bare, which crashed on `useOutletContext()` returning
  null). Assertions changed from "redirects to /projects" to "stays at `/`,
  renders the empty-state message, and auto-opens the Projects overlay"
  (asserted via a `data-testid="overlay-kind"` probe on the stub layout) for
  every no-projects scenario (no stored id, null stored id, corrupted stored
  id); the last-project-id and projects-exist redirects are unchanged.
- `src/app/ProjectShell.test.tsx` — the "Back to Projects" not-found-state
  link assertion changed from `href="/projects"` to `href="/"`, matching
  `ProjectNotFound`'s updated target (Projects has no route any more).

New test files for Revision 3 behavior not previously covered by any suite:
- `src/shared/hooks/useOverlayStack.test.ts` (new) — pure hook-level coverage
  of the stack mechanics: open/push/back/dismiss transitions for both the
  two-level Projects stack and the one-level Config stack, `back()`/
  `openProjectSettings()` no-ops at invalid states, and `hasOverlayDepth()`
  for all three states (root, pushed, config).
- `src/app/OverlayHost.test.tsx` (new) — the overlay frame in isolation
  (panel bodies mocked): renders nothing when closed; Back absent at the
  Projects root and on Config, present once Settings is pushed; Dismiss
  clears the whole stack from either Projects level and from Config; backdrop
  click dismisses; Escape pops one level when depth exists and dismisses at
  the root/Config; and explicit composition with the shared `useModalEscape`
  stack — a modal already registered underneath only receives Escape once the
  overlay (registered later, topmost) has unregistered.
- `src/app/RootLayout.test.tsx` (new) — wires the real `useOverlayStack` +
  `TopBar` + `OverlayHost` together (panel bodies still mocked) against a
  route tree shaped like `router.tsx`'s main-view routes, including a nested
  story-detail-style route: clicking Projects/Config opens the overlay while
  Sessions or a deep project/story route stays mounted and visibly unchanged
  underneath; Dismiss reveals it again unchanged; each trigger's
  `aria-current` toggles independently; the app-switcher's selected mode
  matches the current route in both Task Manager and Sessions context
  regardless of which overlay is open.
- `src/features/settings/components/ProjectSettingsPanelBody.test.tsx` (new)
  — loading/not-found/load-error states via a mocked `useProjectDetail`; no
  sub-navigation tab bar is rendered; and the "Open in Task Manager" bridge
  (TASK-010, BUG-006) navigates to `/projects/:id/stories` and calls
  `onDismissOverlay()` in the same click — verified both for a normal project
  id and explicitly for a project id with no prior recorded session state,
  the exact BUG-006 reproduction scenario.

Regression coverage already present and left untouched (still green, no
changes needed): `src/app/ProjectSidebar.test.tsx` already asserts the
Manage-Projects link stays absent and that sidebar project selection lands on
Stories; `ProjectShell.test.tsx`'s bare-`/projects/:id`-redirects-to-Stories
test was likewise already correct and untouched apart from the one href fix
above.

**BUG-006 re-verification**: confirmed resolved. See the "Re-verification"
addendum added to
`docs/stories/STORY-022-global-project-navigation/bugs/BUG-006-no-path-from-settings-to-stories-for-unvisited-project.md`
— status moved from `fixed` to `resolved` in both the bug file and
`bugs/index.md`.

**Deviations from plan**:
- Added `RootLayout.test.tsx`, which the task description doesn't name
  explicitly by file, to close a coverage gap the acceptance criteria implied
  but the per-component suites (`TopBar.test.tsx` with a stubbed overlay,
  `OverlayHost.test.tsx` with a stubbed overlay) couldn't reach on their own:
  proving the *real* `useOverlayStack` wiring between `TopBar` and
  `OverlayHost` actually keeps the main-view route mounted and unchanged when
  an overlay opens/closes. Judgment call, not a deviation from any explicit
  instruction.
- `TopBar.test.tsx`'s "keeps both entries visible together" and "same
  relative order across a mode switch" tests were kept (re-targeted at
  buttons instead of links) rather than dropped, since BUG-003 (position
  shift across mode switch) is a real prior regression worth continuing to
  guard even though its entries are no longer `NavLink`s.

**Technical decisions made**:
- Component-level suites (`TopBar.test.tsx`, `OverlayHost.test.tsx`) inject a
  hand-built `OverlayControls` stub rather than rendering `useOverlayStack`
  live, so each suite can assert against every state combination (e.g.
  Config open while on `/projects/...`) without needing multiple real
  interactions to reach it — `useOverlayStack.test.ts` covers the hook's own
  transition correctness directly, and `RootLayout.test.tsx` covers the real
  wiring end-to-end for the specific "route stays mounted" behavior that
  can't be verified with a stub.
- `ProjectsPanelBody`, `ProjectSettingsPanelBody`, and `SystemSettings` are
  mocked in `OverlayHost.test.tsx` and `RootLayout.test.tsx` (each pulls in
  TanStack Query hooks that would otherwise require a `QueryClientProvider`
  and extensive further mocking unrelated to what those two suites test) —
  mirroring the existing precedent in `StorySlideOver.test.tsx` of mocking
  heavy child feature components at the module boundary.
- `ProjectSettingsPanelBody.test.tsx` mocks only `useProjectDetail` and
  `./ProjectSettings`'s `EffectiveSettingsPanel` export, keeping the
  component's own logic (state branching + the "Open in Task Manager" click
  handler) real and under direct test.

**Code locations**:
- Rewritten: `frontend/src/app/TopBar.test.tsx`,
  `frontend/src/features/projects/components/ProjectList.test.tsx`,
  `frontend/src/app/RootRedirect.test.tsx`, `frontend/src/app/ProjectShell.test.tsx`
- New: `frontend/src/shared/hooks/useOverlayStack.test.ts`,
  `frontend/src/app/OverlayHost.test.tsx`, `frontend/src/app/RootLayout.test.tsx`,
  `frontend/src/features/settings/components/ProjectSettingsPanelBody.test.tsx`
- Bug file updated:
  `docs/stories/STORY-022-global-project-navigation/bugs/BUG-006-no-path-from-settings-to-stories-for-unvisited-project.md`
  (+ `bugs/index.md` row)

**Technical debt noted**:
- None new. Full suite: 22 test files / 252 tests, all passing (`npx vitest
  run`). `npm run build` (`tsc --noEmit` + `vite build`) succeeds with no
  errors. No test asserts any retired routing behavior (`/projects`,
  `/settings`, `/projects/:id/settings` as routes, `NavLink`-based
  active-state, or the last-main-view/close-to-main apparatus).

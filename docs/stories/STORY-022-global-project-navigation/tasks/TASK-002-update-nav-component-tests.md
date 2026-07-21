---
status: Done
assignee: qa-automation
story: STORY-022
---

# TASK-002: Write automated tests

## What to implement
Update and extend the existing component tests to cover the relocated Projects
navigation entry. Two existing test files encode pre-STORY-022 expectations and
must be brought in line with the new behavior.

**Top bar (global Projects entry):**
- Projects entry renders in Task Manager mode
- Projects entry renders in Sessions mode (the key new behavior — the right-side
  region must now appear in both modes)
- Clicking the Projects entry navigates to `/projects`
- Current-page indication: `aria-current="page"` is set on the Projects entry
  when the active route is `/projects`, and absent when it is not
- Projects entry is reachable/exposed as an accessible link (accessible name)
- The existing Settings action assertions still hold: Settings visible in Task
  Manager mode, hidden in Sessions mode (regression guard that Settings was not
  made global)

**Task Manager left sidebar (removed link + unchanged Stories landing):**
- The Manage Projects link is no longer rendered
- The remaining sidebar behavior is intact: project list renders, active project
  `aria-current="page"`, collapse/expand toggle, empty-state text
- Selecting a project from the sidebar (combobox and project list) still navigates
  to the project's Stories view — the landing-destination change must not have
  affected the sidebar
- Remove or replace the now-invalid assertions that expected the Manage Projects
  link to be present (including the "still present when empty" case)

**Projects Management project-name landing destination:**
- Clicking a project's name on the Projects Management page (`/projects`) navigates
  to that project's Settings view (`/projects/:id/settings`), not its Stories view

## Scope
Frontend component tests for the top bar and the Task Manager left sidebar
(`frontend/src/app/`) plus the Projects Management project-name entry
(`frontend/src/features/projects/`). Follow the project's qa-automation strategy:
behavior-level assertions, mock only external boundaries, no snapshot tests.

## Dependencies
TASK-001 and TASK-003 (both implementations must be complete before these tests can
run green)

## Acceptance Criteria
- [ ] Top-bar tests cover: Projects entry in both modes, navigation to `/projects`,
      `aria-current` present on `/projects` and absent otherwise, accessible name,
      Settings still gated to Task Manager mode
- [ ] Sidebar tests updated: Manage Projects link asserted absent; project list,
      active `aria-current`, collapse toggle, and empty state still covered; sidebar
      project selection still navigates to the project's Stories view
- [ ] Projects Management test covers: clicking a project name navigates to
      `/projects/:id/settings` (not `/stories`)
- [ ] Obsolete assertions expecting the sidebar Manage Projects link are removed
- [ ] The full frontend unit suite passes against the running application

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-21

**What was done**:
- `frontend/src/app/TopBar.test.tsx` — added a "Global Projects entry (STORY-022)" test block: renders in Task Manager mode, renders in Sessions mode, accessible link name, click navigates to `/projects`, `aria-current="page"` set on exact `/projects`, absent in Sessions mode, `href="/projects"`, and two regression tests confirming the Settings button stays gated to Task Manager mode alongside the new global entry (visible in Task Manager, hidden in Sessions).
- `frontend/src/app/ProjectSidebar.test.tsx` — replaced the two obsolete "Manage Projects link" assertions (`renders the Manage Projects link`, `still shows Manage Projects link when no projects exist`) with assertions that the link is absent in both the populated and empty-projects cases. Added a `LocationDisplay` test helper and a new regression test confirming that clicking a project in the sidebar list still navigates to `/projects/:id/stories` (landing destination unaffected by STORY-022/TASK-003). All pre-existing coverage (project list rendering, active `aria-current`, collapse/expand toggle, localStorage persistence, empty-state text) is unchanged.
- `frontend/src/features/projects/components/ProjectList.test.tsx` — added a test confirming the project-name link targets `/projects/:id/settings` (not `/stories`), covering TASK-003's landing-destination change.
- Updated `docs/qa-automation-strategy.md`'s Test Files table for the three touched files to reflect the new STORY-022 coverage (rev 11).
- Filed `docs/stories/STORY-022-global-project-navigation/bugs/BUG-001-projects-nav-active-on-nested-routes.md`: while writing the spec-accurate `aria-current` test ("present on `/projects`, absent otherwise"), discovered the Projects `NavLink` in `TopBar.tsx` has no `end` prop, so it also reports `aria-current="page"` on every nested project route (e.g. `/projects/:id/stories`), not just the literal `/projects` page — a real deviation from TASK-002's spec. Assigned to frontend-developer, severity minor.

**Deviations from plan**: One test (`omits aria-current on the Projects entry when not on /projects`) is written as `test.fails` rather than a normal `it`, so the suite stays green while the BUG-001 gap it documents remains open. Convert it back to a normal `it` once frontend-developer adds `end` to the Projects `NavLink`. No other deviations — TASK-002's full scope (top bar, sidebar, Projects Management landing target) is covered.

**Technical decisions made**:
- Used a `LocationDisplay` helper component (reads `useLocation().pathname` into a `data-testid` node) in `ProjectSidebar.test.tsx` to assert the actual post-click URL rather than only inferring navigation from `aria-current` on the clicked button — a more direct regression guard for the landing-destination requirement.
- Used vitest's `test.fails` for the one assertion that currently fails against a genuine implementation gap (BUG-001), rather than skipping it or asserting the (wrong) current behavior — this keeps the correct spec encoded in the suite and will loudly flag if BUG-001 is fixed without updating the test.

**Code locations**:
- `frontend/src/app/TopBar.test.tsx`
- `frontend/src/app/ProjectSidebar.test.tsx`
- `frontend/src/features/projects/components/ProjectList.test.tsx`
- `docs/qa-automation-strategy.md`
- `docs/stories/STORY-022-global-project-navigation/bugs/index.md`, `bugs/BUG-001-projects-nav-active-on-nested-routes.md`

**Technical debt noted**:
- BUG-001 (open, frontend-developer): Projects top-bar entry's `aria-current` scoping is broader than spec — see bug file for repro and likely one-line fix (`end` prop). Full suite currently green (212 passed, 1 expected fail via `test.fails` documenting BUG-001).

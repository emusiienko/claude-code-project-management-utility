---
status: Done
assignee: qa-automation
story: STORY-022
---

# TASK-005: Extend automated tests for the standalone Project Settings screen

> **Superseded by Revision 3 (TASK-011, 2026-07-22).** The standalone Project Settings screen is gone; its route/heading/back-link assertions are replaced by overlay-panel assertions in TASK-011. Work and report below are unchanged historical record.

## What to implement
Extend the component tests to cover Project Settings as a standalone screen. This
builds on TASK-002's coverage (which stays valid) — add the new assertions and
re-run the suite green.

**Per-project sub-navigation:**
- The sub-navigation exposes exactly Stories, Board, and Milestones; there is no
  Settings tab

**Standalone Project Settings screen:**
- `/projects/:id/settings` renders the standalone Project Settings screen — its
  project-named heading and a back-link to `/projects` are present, and the
  per-project tab bar is not rendered around it
- The back-link navigates to `/projects`
- An unresolved project id on `/projects/:id/settings` renders the not-found state

**Regression guards (must still hold):**
- Clicking a project name on `/projects` resolves to `/projects/:id/settings`
  (TASK-003 coverage — keep it)
- The top-bar Projects entry has no `aria-current="page"` on `/projects/:id/settings`
  (BUG-001 guard extended to the standalone URL)
- A bare `/projects/:id` still redirects to Stories
- The Task Manager sidebar's project selection still lands on Stories

## Scope
Frontend component tests for the route table / per-project sub-navigation shell and
the Project Settings page (`frontend/src/app/`, `frontend/src/features/settings/`),
plus the existing top-bar / sidebar / Projects Management tests where a regression
guard applies. Follow the qa-automation strategy: behavior-level assertions, mock
only external boundaries, no snapshot tests.

## Dependencies
TASK-004 (implementation must be complete before these tests can run green)

## Acceptance Criteria
- [ ] Sub-navigation test asserts exactly Stories, Board, Milestones (no Settings tab)
- [ ] A test asserts `/projects/:id/settings` renders the standalone screen (heading +
      back-link to `/projects`, no per-project tab bar)
- [ ] A test asserts the back-link navigates to `/projects`
- [ ] A test asserts the not-found state for an unresolved project id on the settings URL
- [ ] Regression guards pass: project-name click resolves to the settings URL; top-bar
      Projects entry inactive on it; bare `/projects/:id` redirects to Stories; sidebar
      selection lands on Stories
- [ ] The full frontend unit suite passes against the running application

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-21

**What was done**:
- Fixed the two stale test failures TASK-004 pre-flagged as owned by this task:
  - `ProjectShell.test.tsx`: replaced the "renders all four sub-nav tabs" test with
    a "renders exactly three sub-nav tabs (Stories, Board, Milestones)" test, and
    added a dedicated negative assertion that no "Settings" link renders in the
    sub-nav.
  - `ProjectSettingsPage.test.tsx`: rewrote the whole file to mock
    `useProjectDetail` directly (the same pattern `ProjectShell.test.tsx` already
    used) instead of rendering the page bare with no `QueryClientProvider` — the
    page now resolves the project itself via that hook since it no longer renders
    inside `ProjectShell`. Kept the existing four assertions (heading, panel
    render, project ID passed through, override copy) and added new ones for the
    standalone-screen chrome and states: project-named `<h1>`, back-link to
    `/projects`, loading indicator, not-found state, load-error state, and a
    negative assertion that no per-project sub-nav (`Project sections` landmark /
    Stories tab) renders around the page.
- Added the remaining regression-guard assertions the task called for that had no
  existing coverage:
  - `ProjectShell.test.tsx`: extended the render helper to mount the same nested
    `index → Navigate to "stories"` route shape the real router table uses, and
    added a test asserting a bare `/projects/:id` still redirects to the Stories
    tab.
  - `TopBar.test.tsx`: added a test asserting the top-bar Projects entry has no
    `aria-current="page"` on the standalone `/projects/:id/settings` URL,
    extending the existing BUG-001 guard (which only covered
    `/projects/:id/stories`) to the new standalone URL.
- Confirmed the other regression guards the task lists were already in place and
  did not need new tests: `ProjectList.test.tsx` already asserts the project-name
  link targets `/projects/:id/settings` (TASK-003 coverage); `ProjectSidebar.test.tsx`
  already asserts sidebar project selection still lands on Stories.
- Ran the full frontend suite (`npx vitest run`) and `tsc --noEmit`; both are
  clean.

**Deviations from plan**: None. All acceptance criteria items are covered by new
or pre-existing assertions; no scope was added beyond what TASK-004's technical
debt note and this task's description called for.

**Technical decisions made**:
- Rewrote `ProjectSettingsPage.test.tsx` to mock the hook rather than wrap the
  render in a `QueryClientProvider` — consistent with how `ProjectShell.test.tsx`
  already tests the sibling standalone-screen pattern (`MilestoneDetailPage` has
  no test file to compare against), and it keeps the test focused on the page's
  own branching logic (loading/not-found/error/success) rather than on TanStack
  Query's internals, per the strategy's "mock only external boundaries" rule.
- Extended `ProjectShell.test.tsx`'s render helper with real nested routes
  (`index` → `Navigate`, `stories` leaf) instead of adding a separate
  `router.test.tsx` file, since the bare-URL redirect is declared as a child of
  `ProjectShell` in `router.tsx` and the existing helper already owns the route
  wrapper for this component — no new test file was needed.

**Code locations**:
- `frontend/src/app/ProjectShell.test.tsx` — updated sub-nav test, added
  Settings-absent test, added bare-URL-redirect test, extended render helper
- `frontend/src/features/settings/ProjectSettingsPage.test.tsx` — rewritten
- `frontend/src/app/TopBar.test.tsx` — added BUG-001-guard-extension test
- `docs/qa-automation-strategy.md` — updated the three affected Test Files table
  rows to describe current coverage; bumped to rev 12

**Technical debt noted**: None new. The pre-existing STORY-022 doc-reconcile debt
(`docs/architecture.md`, `docs/requirements/requirements_web.md`,
`docs/qa/test-cases.md` + `TC-025`, `docs/tech_decisions/ADR-014` still describing
the four-tab sub-nav) remains owned by architect/manual-qa/spec-writer at
Reconcile, as noted in TASK-004's report — not touched here.

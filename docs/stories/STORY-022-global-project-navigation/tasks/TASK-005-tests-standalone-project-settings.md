---
status: ToDo
assignee: qa-automation
story: STORY-022
---

# TASK-005: Extend automated tests for the standalone Project Settings screen

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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

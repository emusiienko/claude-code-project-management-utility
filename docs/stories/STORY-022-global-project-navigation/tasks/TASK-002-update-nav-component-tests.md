---
status: ToDo
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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

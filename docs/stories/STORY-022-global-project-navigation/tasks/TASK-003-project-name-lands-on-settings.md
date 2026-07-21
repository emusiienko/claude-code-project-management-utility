---
status: ToDo
assignee: frontend-developer
story: STORY-022
---

# TASK-003: Change the Projects Management project-name landing destination to Settings

## What to implement
On the Projects Management page (`/projects`), clicking a project's name currently
navigates into that project and lands on its Stories view. Change that single click
target so it lands on the project's **Settings** view (`/projects/:id/settings`)
instead.

- Retarget only the project-name click on the Projects Management list. Set the
  Settings destination explicitly at that click target.
- Do not change the Task Manager sidebar's project selection (combobox and project
  list): it must continue to land on the project's Stories view.
- Do not change the router's default landing for a bare project URL — the sidebar
  relies on that default and must remain unaffected. Set the new destination at the
  click target, not by repointing the shared default.
- No functionality is removed: Stories, Board, and Milestones stay reachable through
  the project's existing sub-navigation tabs once inside the project.

## Scope
Frontend only — the project-name entry in the Projects Management list
(`frontend/src/features/projects/`). No backend, no API contract, no data model,
and no change to the shared router default or the Task Manager sidebar.

## Dependencies
None (independent of TASK-001)

## Acceptance Criteria
- [ ] Clicking a project's name on `/projects` navigates to `/projects/:id/settings`
- [ ] The Task Manager sidebar's project combobox and project list still navigate to
      the project's Stories view when a project is selected
- [ ] Stories, Board, and Milestones remain reachable via the project sub-navigation
      tabs after landing on Settings — no functionality removed
- [ ] Clicking a project with no settings overrides lands on its Settings view showing
      values inherited from system defaults (pre-existing inherited state unchanged)

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

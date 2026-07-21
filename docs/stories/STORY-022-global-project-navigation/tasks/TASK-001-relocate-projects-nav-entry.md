---
status: ToDo
assignee: frontend-developer
story: STORY-022
---

# TASK-001: Relocate the Projects navigation entry to the global top bar

## What to implement
Move the single navigation entry point for project management from the Task
Manager left sidebar to the persistent top bar, so it is reachable identically
from every app mode.

**Add a global Projects entry to the top bar:**
- Place it in the top bar's right-side region, alongside the existing Settings
  action.
- It must be present in both Task Manager mode and Sessions mode. Today the
  right-side region renders only in Task Manager mode; make it render in both so
  the Projects entry is always visible. Its position and behavior must be
  identical across modes and unaffected by route state (an open Story slide-over
  or Task Detail modal).
- Clicking it navigates to the existing Projects management page at `/projects`;
  that page's own behavior is unchanged.
- It shows an active/current-page indication when the user is already on
  `/projects`, using the app's established router-driven active-state pattern
  (the same `NavLink` `isActive` → `aria-current="page"` approach used by the
  project sub-nav tabs and the sidebar project list). Do not introduce a new
  active-state mechanism.
- It is keyboard-focusable with a visible focus indicator matching the rest of
  the top bar's controls.

**Remove the sidebar entry:**
- Remove the `Manage Projects` link from the Task Manager left sidebar, along
  with any sub-component and icon import that exist solely to support it, so
  exactly one path to project management remains. Leave the sidebar's project
  list and collapse toggle unchanged.

The existing Settings action stays gated to Task Manager mode as it is today —
this task does not change Settings' visibility or behavior.

## Scope
Frontend only — the persistent top bar and the Task Manager left sidebar in
`frontend/src/app/`. No backend, no API contract, no data model changes.

## Dependencies
None

## Acceptance Criteria
- [ ] A Projects entry is visible in the persistent top bar in both Task Manager
      and Sessions modes, positioned near the Settings action
- [ ] Clicking the Projects entry navigates to `/projects`; the Projects page's
      list/create/edit/delete behavior is unchanged
- [ ] The Manage Projects link is removed from the Task Manager left sidebar;
      there is no second, mode-dependent path to project management
- [ ] The Projects entry shows current-page indication (via `aria-current="page"`)
      when on `/projects`, consistent with other current-page indicators in the app
- [ ] The Projects entry is keyboard-accessible with a visible focus indicator
      consistent with the rest of the top bar
- [ ] Navigating to Projects while a Story slide-over or Task Detail modal is open
      dismisses it and updates the URL to `/projects`, as normal top-level
      navigation (no bespoke dismissal logic added)
- [ ] The Projects entry's position and behavior are identical in Task Manager and
      Sessions modes; switching modes does not hide or move it
- [ ] The existing Settings action remains Task-Manager-only and otherwise unchanged

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

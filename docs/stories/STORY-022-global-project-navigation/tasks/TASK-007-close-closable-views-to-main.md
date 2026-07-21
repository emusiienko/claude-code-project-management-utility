---
status: ToDo
assignee: frontend-developer
story: STORY-022
---

# TASK-007: Close closable views to the last main view

## What to implement
Replace the browser-history "Back" affordance on the two top-level closable
views — the Projects management page and the system Config page — with a
"close" affordance that returns to the recorded last main view (Task Manager or
Sessions).

Each page's close control navigates to the last main-view URL recorded by
TASK-006 (path + query), rather than stepping through browser history. When no
main view has been recorded yet (e.g. a cold load straight into a closable
view), the control falls back to `/`, which the existing root redirect resolves
to a Task Manager destination.

Because the recorded URL carries the full main-view state, closing returns the
user to exactly the view they were in — including a deep Task Manager URL with
an open story slide-over or task modal, or the Sessions view — independent of
how they reached the closable view or how deep the browser history is.

Project Settings (`/projects/:id/settings`) is a sub-page of the Projects
closable view and keeps its existing fixed back-link to `/projects` — it is
outside this task's scope.

## Scope
The Projects management page and the system Config page (their back/close
controls only). Consumes the last-main-view record and classification from
TASK-006. Frontend only.

## Dependencies
TASK-006 (provides the recorded last-main-view URL and the classification).

## Acceptance Criteria
- [ ] Closing the Projects page returns to the recorded last main view (a deep Task Manager URL is restored exactly; a Sessions origin returns to Sessions)
- [ ] Closing the Config page returns to the recorded last main view under the same rules
- [ ] On a cold load directly into a closable view with no recorded main view, closing falls back to `/` and lands on a Task Manager destination
- [ ] Neither close control relies on browser history (`navigate(-1)` is no longer used on these two pages)
- [ ] The close control stays keyboard-accessible with a visible focus indicator, consistent with the existing affordance it replaces
- [ ] `npx tsc --noEmit` passes

## Supersedes (in part)
- BUG-005 (the `navigate(-1)` Back button added to the Projects page) and the equivalent `navigate(-1)` Back button on the Config page.
Leave the BUG-005 report as the historical record; do not edit it. The paused manual-qa re-verification of BUG-005 is superseded by this task and waits until it ships.

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

---
status: ToDo
assignee: frontend-developer
story: STORY-007
---

# TASK-005: Mount attachments section in story, task, and milestone views

## What to implement

Mount the reusable Attachments section (TASK-004) into its three host screens, replacing the current
static placeholders and passing the appropriate container identity:

- **Story Detail slide-over** — the Attachments block in the right panel (container = story).
- **Task Detail modal** — the Attachments section in the scrollable body (container = task).
- **Milestone Detail view** — the Attachments section on the milestone page (container = milestone).

Each mount passes the container type and id plus the owning project id (needed to populate the type
dropdown from effective `attachment_types`). Confirm the section behaves consistently across all three
hosts — including within the modal/slide-over stacking context — and that focus handling and Escape
behavior of the surrounding panels are preserved.

## Scope
`frontend/src/features/stories/` (slide-over right panel), `frontend/src/features/tasks/` (task detail
modal), `frontend/src/features/milestones/` (milestone detail page). No changes to the attachments
feature module itself.

## Dependencies
TASK-004.

## Acceptance Criteria
- [ ] The Story slide-over right panel shows a live Attachments section for the story, replacing the placeholder.
- [ ] The Task Detail modal shows a live Attachments section for the task, replacing the placeholder.
- [ ] The Milestone Detail view shows a live Attachments section for the milestone.
- [ ] Adding, viewing/downloading, and deleting work in every host without a page refresh.
- [ ] The type dropdown in each host is populated from the project's effective `attachment_types`.
- [ ] Existing focus-trap and Escape behavior of the slide-over and modal is unaffected by the mounted section.

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
</content>

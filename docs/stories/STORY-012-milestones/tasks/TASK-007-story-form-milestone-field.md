---
status: ToDo
assignee: frontend-developer
story: STORY-012
---

# TASK-007: Story-form milestone field

## What to implement

Add an optional milestone selector to the story create/edit form.

- The selector lists only milestones belonging to the story's project, plus a "none" option.
- On create, the chosen milestone (if any) is sent as the story's `milestone_id`; leaving it unset
  creates a story with no milestone.
- On edit, the selector reflects the current assignment and can change or clear it via the existing
  story-update path.

## Scope

Frontend Stories feature — the milestone field on the story form. Consumes the project-scoped
milestone list and the existing story create/update paths. This complements the slide-over control
(TASK-006) so assignment is possible both at creation and from the detail view.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] The story form shows an optional milestone selector listing only the project's milestones plus
      "none"
- [ ] Creating a story with a milestone selected assigns it; leaving it unset creates an unassigned
      story
- [ ] Editing reflects the current assignment and can change or clear it

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

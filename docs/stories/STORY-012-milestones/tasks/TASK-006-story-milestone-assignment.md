---
status: ToDo
assignee: frontend-developer
story: STORY-012
---

# TASK-006: Story milestone-assignment control (slide-over)

## What to implement

Add an inline milestone-assignment control to the Story Detail slide-over.

- Show the story's current milestone assignment (name, or "none").
- Offer an inline control to set the milestone or clear it (set to null), populated only with
  milestones belonging to the story's project.
- Setting or clearing uses the existing story-update path (`milestone_id`) and does not alter any
  other story field.
- Reflect the updated assignment immediately after the change.

## Scope

Frontend Story Detail slide-over — the inline milestone set/clear control. Consumes the milestone
list (scoped to the story's project) and the existing story-update path.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] The story's current milestone assignment is visible in the slide-over
- [ ] The control lists only milestones belonging to the story's project
- [ ] Assigning or clearing the milestone updates only `milestone_id` and reflects immediately

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

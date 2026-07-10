---
status: ToDo
assignee: frontend-developer
story: STORY-012
---

# TASK-005: Board active-milestone filter

## What to implement

Wire the Board view at `/projects/:id/board` to the project's active milestone.

- Determine the project's active milestone by reading the project's milestone list and selecting the
  single milestone whose status is `active`.
- When an active milestone exists, the Board loads showing only stories assigned to it (filter the
  existing story fetch by `milestone_id`). Show a visible filter label with the active milestone's
  name and a toggle to show all stories.
- The "show all" toggle drops the milestone filter and shows every story regardless of assignment.
  The toggle state persists per project until the user navigates away from the Board.
- When no active milestone exists for the project, the Board shows all stories with no filter and no
  filter indicator.
- When the filtered view contains zero stories, show an empty state prompting the user to assign
  stories or toggle to show all.

## Scope

Frontend Board feature — active-milestone discovery, story-list filtering by `milestone_id`, the
filter label, the "show all" toggle (persisted per project), and the filtered empty state. Uses the
existing story list with the `milestone_id` query parameter added in TASK-002.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] With an active milestone, the Board defaults to that milestone's stories, with a visible filter
      label (milestone name) and a "show all" toggle
- [ ] "Show all" shows every project story; the toggle persists per project until navigation away
- [ ] With no active milestone, the Board shows all stories with no filter indicator
- [ ] A filtered view with zero stories shows an empty state prompting to assign stories or show all

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

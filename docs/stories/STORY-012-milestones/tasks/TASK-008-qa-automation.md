---
status: ToDo
assignee: qa-automation
story: STORY-012
---

# TASK-008: Write automated tests

## What to implement

Write automated tests covering the following:

**Endpoints / operations:**
- POST /milestones — happy path (created as `planned`), missing/unknown `project_id` (404),
  duplicate name in same project (409), same name allowed in a different project
- GET /milestones — list all, filtered by `project_id`; each item includes `project_id`, `status`,
  `story_count`
- GET /milestones/:id — found, not found (404)
- PUT /milestones/:id — updates name/description; name conflict (409); `project_id` cannot be changed
- DELETE /milestones/:id — 204; assigned stories have `milestone_id` cleared and are not deleted
- POST /milestones/:id/activate — sets `active`; idempotent when already active; valid from `finished`
- POST /milestones/:id/finish — sets `finished`; idempotent when already finished
- GET /milestones/:id/stories — paginated assigned stories; 404 for unknown milestone
- GET /stories?milestone_id=… — filters to a milestone's stories; unknown id yields an empty page
- PUT /stories/:id (milestone_id) — assign valid milestone; clear to null; reject cross-project
  milestone (422); reject non-existent milestone (404)

**Behaviors:**
- Single-active invariant — activating a milestone when another in the same project is `active`
  demotes the previous one to `planned`; the project never has two `active` milestones. Activating in
  one project does not affect another project's active milestone.
- Delete-clears-assignment — deleting a milestone nulls `milestone_id` on its stories without deleting
  them; deleting a project deletes its milestones and clears `milestone_id` on that project's stories.
- Wire status values are lowercase (`planned`/`active`/`finished`).
- REST and MCP surfaces are behavior-identical for the milestone operations.

**Edge cases:**
- A milestone with no stories assigned is valid (story_count 0)
- Assigning a story to a milestone in a different project is rejected (422)
- Assigning a story to a non-existent milestone returns 404
- Re-activating a `finished` milestone follows the same demote-previous flow

## Scope

Backend milestone domain (REST + MCP), the stories-service milestone-assignment validation, and the
story-list `milestone_id` filter. Frontend Board filter behaviour where covered by the strategy's
frontend test layer.

## Dependencies

TASK-002 (implementation must be complete before tests can run green); TASK-005 for any Board-filter
frontend coverage.

## Acceptance Criteria

- [ ] All listed endpoints and behaviors have at least one test
- [ ] The single-active-per-project invariant is explicitly tested, including cross-project isolation
- [ ] Tests pass against the running application on the default (SQLite) configuration

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

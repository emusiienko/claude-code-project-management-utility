---
status: ToDo
assignee: backend-developer
story: STORY-012
---

# TASK-002: Milestone domain slice — REST + MCP + story-assignment validation

## What to implement

Build the full `milestones` domain slice following the established per-app pattern (model,
repository, service, schemas, REST controller, mirrored MCP tools). All business logic lives in the
service; controller and MCP tools stay thin and behavior-identical. Implement the v1.2 Milestones
contract exactly.

**Milestone CRUD:**
- Create with a required `name`, a required `project_id` (validated to exist — 404 if missing), and
  an optional `description`. New milestones start with status `planned`.
- Name is unique case-insensitively within the milestone's project — 409 on collision with the
  message "A milestone named '{name}' already exists in this project."
- List with pagination, optionally filtered by `project_id`; each item includes `project_id`,
  `status`, and `story_count`.
- Get by id; detail composing side collections (active attachments, comments) plus `story_count` —
  assigned stories themselves are not included (paginated separately).
- `story_count` is a server-derived field, not stored on the milestone. The service computes it at
  read time as the number of stories whose `milestone_id` equals the milestone's id, so it stays
  consistent as stories are assigned, cleared, or the milestone is deleted. It appears on both the
  list items and the detail response. Compute it in the data layer (a grouped `COUNT` over `story` by
  `milestone_id`, resolved in one query for the list — not one query per milestone) and keep it
  dialect-agnostic (SQLite and PostgreSQL).
- Update accepts only `name` and `description`; `project_id` is immutable after create.
- Delete sets `milestone_id = null` on all assigned stories (no story deleted).
- List a milestone's assigned stories with pagination.

**Lifecycle transitions (action endpoints, server-owned and atomic):**
- Activate: set the milestone's status to `active`. If another milestone in the **same project** is
  currently `active`, demote it to `planned` in the **same transaction** as promoting the target, so
  the project never has two active milestones. Idempotent (already-active → no-op success). Valid
  from any prior status (a `finished` milestone can be re-activated).
- Finish: set status to `finished` with no side effect on other milestones. Idempotent.

**Story-side milestone assignment (stories service):**
- When a story's `milestone_id` is set to a non-null value (create or update), validate the milestone
  exists (404) and belongs to the story's project (422 "This milestone does not belong to the story's
  project."). Clearing `milestone_id` (null) is always allowed and changes no other field.

**Story-list milestone filter:**
- Add an optional `milestone_id` query parameter to the story list that filters to stories assigned
  to that milestone. An unknown `milestone_id` yields an empty page (not an error).

## Scope

`backend/app/milestones/` (new slice), plus targeted additions to `backend/app/stories/`
(milestone-assignment validation + `milestone_id` list filter). REST and MCP surfaces must stay
behavior-identical over the shared service.

## Dependencies

TASK-001

## Acceptance Criteria

- [ ] Full milestone CRUD over REST and mirrored MCP tools, behavior-identical
- [ ] Name uniqueness enforced case-insensitively within a project (409)
- [ ] `project_id` required and validated on create (404); immutable on update
- [ ] Activate demotes the project's current active milestone and promotes the target atomically;
      never leaves two active milestones in one project
- [ ] Activate and finish are idempotent; activate is valid from `planned` and `finished`
- [ ] Deleting a milestone clears `milestone_id` on its stories; deletes no story
- [ ] Story assignment rejects a milestone from a different project (422) and a non-existent milestone
      (404); clearing to null always succeeds
- [ ] Story list accepts optional `milestone_id`; unknown id yields an empty page
- [ ] `story_count` is present on both list items and detail, server-derived as the count of stories
      with that `milestone_id` (list resolved without a per-milestone query), and reads 0 for a
      milestone with no assigned stories
- [ ] All error shapes and status codes match api-contract v1.2

## Intended ADR

See implementation_plan.md "Planned ADRs" — the single-active-per-project invariant enforced by the
service transaction (ADR created at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

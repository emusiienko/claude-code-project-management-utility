---
status: Done
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

**Date**: 2026-07-10

**What was done**:
Built the full `milestones` domain slice and extended the stories domain:

1. `backend/app/milestones/` — new domain package following the established per-app pattern:
   - `model.py` — `Milestone` ORM model with `project_id` FK (CASCADE), `name`, `description`, `status` (default "planned"), timestamps
   - `schema.py` — `CreateMilestone`, `UpdateMilestone` request schemas with field-level validators; `Milestone` response schema with `story_count: int | None`; `MILESTONE_STATUS_*` constants (single source of truth for the three wire values)
   - `repository.py` — `MilestoneRepository` extending `BaseRepository[Milestone]`: `get_name_conflict`, `get_active_for_project`, `list_paginated`, `get_story_counts` (batched GROUP BY — no N+1), `get_story_count`, `clear_story_links` (bulk UPDATE stories.milestone_id = NULL)
   - `service.py` — `MilestoneService` with full CRUD + activate (atomic demote-then-promote) + finish (idempotent), `get_with_story_count`, `list_stories`; `_assert_name_unique` enforces case-insensitive uniqueness within a project
   - `controller.py` — 7 thin REST handlers: POST, GET list, GET by id (with story_count), PUT, DELETE, POST activate, POST finish, GET stories; all under `/v1/milestones`
   - `mcp_tools.py` — 7 MCP tools mirroring the REST surface exactly

2. `backend/app/stories/` — targeted extensions:
   - `repository.py`: added `milestone_id_filter: uuid.UUID | None` to `list_paginated`, added `list_paginated_by_milestone` for `GET /milestones/:id/stories`
   - `service.py`: added `milestone_repo: MilestoneRepositoryProtocol | None` injected dependency; `create` and `update` validate `milestone_id` (404 if missing, 422 if wrong project); `list_paginated` accepts `milestone_id_filter: str | None` (malformed UUID → empty page); `MilestoneRepositoryProtocol` runtime-checkable Protocol defined at module end
   - `controller.py`: `milestone_id` query param added to `list_stories`
   - `mcp_tools.py`: `milestone_id` param added to `list_stories`

3. `backend/app/container/container.py` — `milestone_repository` + `milestone_service` providers; `story_service` now receives `milestone_repo=milestone_repository`; Milestones section placed before Stories to avoid provider forward-reference issues

4. `backend/app/container/mcp_dependencies.py` — `provide_milestone_service` bridge added

5. `backend/app/api/routes.py` — `MILESTONES = "milestones"` added to `AppPath`

6. `backend/app/api/router.py` — milestones router included under `/v1/milestones`

7. `backend/app/main.py` — `"app.milestones"` added to `container.wire()` packages list

**Deviations from plan**:
None. All acceptance criteria implemented as specified.

**Technical decisions made**:

- **`MilestoneRepositoryProtocol` in `stories/service.py`**: To avoid a circular import (`milestones/` imports `stories/model.py` for `get_story_counts`; `stories/` would import `milestones/` for validation), a minimal `runtime_checkable` Protocol is defined at the bottom of `stories/service.py`. The concrete `MilestoneRepository` satisfies it via duck typing. The `if TYPE_CHECKING` guard is used for the `MilestoneModel` annotation so the actual import only runs for type checkers, not at runtime.

- **`story_count` composition in controller/MCP tool**: `Milestone.model_validate(m).model_dump()` then `m_dict["story_count"] = count` because the ORM model does not carry `story_count` (it is computed). On the detail endpoint `get_with_story_count` returns a tuple; on the list endpoint `list_paginated` returns `list[tuple[Milestone, int]]`. Both surfaces are consistent.

- **Empty-page semantics for malformed `milestone_id` filter**: a malformed UUID in `milestone_id_filter` on the story list returns `[], 0` immediately (before the DB query) rather than raising a validation error. This matches the contract: "unknown milestone_id yields an empty page (not an error)".

- **`story_service` provider placement**: moved `milestone_repository` provider above the Stories section in `container.py` so `story_service` can reference `milestone_repository` by name without forward-reference issues in `dependency_injector`.

**Code locations**:
- `backend/app/milestones/` — entire new domain slice
- `backend/app/stories/repository.py` — `milestone_id_filter` + `list_paginated_by_milestone`
- `backend/app/stories/service.py` — milestone validation + `MilestoneRepositoryProtocol`
- `backend/app/stories/controller.py` — `milestone_id` query param on list
- `backend/app/stories/mcp_tools.py` — `milestone_id` param on `list_stories`
- `backend/app/container/container.py` — new Milestones providers, wired `story_service`
- `backend/app/container/mcp_dependencies.py` — `provide_milestone_service`
- `backend/app/api/routes.py` — `MILESTONES` path enum
- `backend/app/api/router.py` — milestones router registration
- `backend/app/main.py` — `"app.milestones"` in wire list

**Technical debt noted**:
- Pre-existing: `mcp_tools.py` for stories calls `service.create(project_id=project_id, data=body)` but the service signature is `create(self, data: CreateStory)` — the `project_id` kwarg is silently ignored. This pre-existed this task and was not introduced by this work. Noted here for QA awareness; tracked via the existing pre-existing test coverage gap.

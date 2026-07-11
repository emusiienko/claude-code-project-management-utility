---
status: ToDo
assignee: backend-developer
story: STORY-005
---

# TASK-001: Tasks domain backend slice

## What to implement

Build the complete `tasks` vertical-slice domain package following the established per-domain pattern (model, repository, service, schema, controller, mcp_tools), then wire it through the global `AppContainer`.

**Model** — declare the ORM model for the `task` table. The table was created by an earlier migration in the initial schema chain; verify it is present in the applied migration sequence. If it is missing, add a new root-first, inline-FK revision per ADR-010. Declare all columns and the four indexes already specified in the architecture: `(story_id, status)`, `(story_id, type)`, `(assignee_role)`, `(creator_role)`.

**Repository** — extend `BaseRepository[Task]`. String→UUID coercion for malformed IDs is inherited (yields `NotFoundError` / 404 per ADR-011). Provide: `coerce_story_id`, a scoped-by-story read by ID, a paginated list scoped to a story with independent filters (status, type, assignee_role, creator_role), and a batched status-count read grouped by status for one story (mirrors the milestone repository's `GROUP BY` story-count query). Label filtering reuses the existing dialect-aware JSON-array filter helper in `core/database` — no new dialect branches.

**Service** — the single home of all task business rules. Resolve the owning project transitively (`task.story_id → story.project_id`) and validate the four dictionary-bound fields against the project's effective dictionaries via the `EffectiveDictionary` Protocol: `type` against `task_types`, `status` against `task_statuses`, and `assignee_role` / `creator_role` against `participant_roles`. Assert parent-story existence before any write (404 if absent). `story_id` is immutable on update. Delete is a permanent hard delete. A disallowed dictionary value yields `422 UNPROCESSABLE` with a message listing the allowed values.

**Schema** — Pydantic request/response schemas derived exactly from the locked v1.0 API contract: `CreateTask`, `UpdateTask`, `Task`, and `PaginationMeta`. No shape changes.

**Controller** — thin REST route handlers over the service. Create + list under the story path (`POST /v1/stories/:id/tasks`, `GET /v1/stories/:id/tasks`); get / update / delete under the task path (`GET /v1/tasks/:id`, `PUT /v1/tasks/:id`, `DELETE /v1/tasks/:id`), exactly as the contract specifies.

**MCP tools** — five tools mirroring the REST surface (`create_task`, `list_tasks`, `get_task`, `update_task`, `delete_task`), behavior-identical to the REST handlers.

**AppContainer wiring** — add the task repository provider; inject it into the task service; add the `tasks` package to `container.wire(packages=[...])` so its tools self-register on import.

## Scope

- `backend/app/tasks/` — new domain package (model, repository, service, schema, controller, mcp_tools, dependencies)
- `backend/app/container/` — add task repository + service providers
- `backend/app/api/` — mount the tasks router
- `backend/app/mcp/` — register task MCP tools
- `backend/migrations/` — only if the `task` table is absent from the applied chain

## Dependencies

None

## Acceptance Criteria

- [ ] A task can be created with required title (1–500 chars), required type (from project's `task_types`), required status (from project's `task_statuses`), optional content, optional `assignee_role` / `creator_role` (from `participant_roles`), optional labels; missing or disallowed dictionary values return 422
- [ ] Tasks within a story can be listed with pagination; independent filters for type, status, `assignee_role`, `creator_role` all work
- [ ] A single task can be retrieved by its ID; `GET /tasks/:id` returns the task fields as specified in the contract
- [ ] A task's title, content, type, status, roles, and labels can be updated; `story_id` cannot be changed
- [ ] A task can be deleted permanently; the task is gone from the DB
- [ ] All five MCP tools behave identically to their REST counterparts
- [ ] A malformed or non-existent task ID returns 404

## Intended ADR

None expected (established pattern).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

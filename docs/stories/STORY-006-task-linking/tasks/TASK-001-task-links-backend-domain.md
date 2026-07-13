---
status: Done
assignee: backend-developer
story: STORY-006
---

# TASK-001: task_links backend domain

## What to implement

A new `task_links` domain package following the established per-domain vertical-slice pattern (model, repository, service, schema, controller, MCP tools). A task link is a directed row between two tasks in the **same story**: a source task, a target task, and a `link_type`. Direction is meaningful and preserved.

**Create operation** — enforces the five validation rules in the service, in this precedence order:

1. Both source and target tasks exist (missing task → 404).
2. Same-story scope: both tasks share the same `story_id` (mismatch → 422, message: "Cannot link tasks from different stories.").
3. No self-link: source and target are not the same task (→ 422, message: "A task cannot link to itself.").
4. `link_type` is present in the owning project's effective `link_types` dictionary. Resolve the project transitively via `task → story → project` and validate against the effective dictionary using the existing effective-dictionary resolution already injected into the tasks service (→ 422 for a value outside the dictionary).
5. No duplicate: a link with the same source task, target task, and `link_type` must not already exist (→ 409, message: "This link already exists.").

Field-shape validation (non-empty target id, non-empty `link_type`) stays in the input schema and surfaces as 422 via request validation. ID coercion stays in the base repository.

**List operation** — returns enriched links for a given task. Each row carries a `direction` marker (`outbound` when the viewed task is the source, `inbound` when it is the target) and a linked-task summary (`id`, `title`, `status`). Supports a `direction` filter (`outbound` | `inbound` | `both`, default `both`), a `link_type` filter, and standard pagination. Enrichment must be **batched**: after loading the link rows for the viewed task, load all counterpart task summaries in one query per direction keyed by the set of counterpart ids — never a per-row lookup. The linked-task summary is read directly through this domain's own repository session against the task table; do not call into the tasks service.

**Delete operation** — deletes a task link by its own id.

**Repository** — in addition to the create/list/get/delete needed by the service, expose a batch enrichment read (counterpart summaries by id set) and a "delete all links referencing a given task id" operation (either side, source or target) for use by TASK-003. This task creates that repository method; TASK-003 consumes it.

**Wiring** — register the service provider on the DI container and add the controller's routers to the app router. Register the MCP tools. Add the new package to the container wiring package list so the MCP tools self-register.

**Endpoints:**
- `POST /tasks/:taskId/links` — create a link from the path task to a target task.
- `GET /tasks/:taskId/links` — list enriched links for the path task (`direction`, `link_type`, pagination).
- `DELETE /task-links/:id` — delete a link by its own id. `task-links` is a new top-level path.

**MCP tools** — mirror the three REST operations exactly, sharing the same service methods (no logic in the tool layer).

## Scope

New `backend/app/task_links/` domain package; DI container; app router; MCP tool registration; container wiring package list.

## Dependencies

None.

## Acceptance Criteria

- [ ] A directed typed link can be created between two tasks in the same story via `POST /tasks/:taskId/links`.
- [ ] Creating a link with a `link_type` not in the project's effective `link_types` is rejected (422).
- [ ] Linking a task to itself is rejected (422, "A task cannot link to itself.").
- [ ] Linking tasks from different stories is rejected (422, "Cannot link tasks from different stories.").
- [ ] A duplicate link (same source, target, and type) is rejected (409, "This link already exists.").
- [ ] A missing source or target task yields 404, and existence is checked before scope/self/dictionary and before duplicate.
- [ ] `GET /tasks/:taskId/links` returns enriched links with `direction` and a linked-task summary (`id`, `title`, `status`), honoring the `direction` (default `both`) and `link_type` filters and pagination; enrichment issues no per-row query.
- [ ] `DELETE /task-links/:id` removes a link by its own id.
- [ ] The repository exposes a "delete all links referencing a task id" method (either side) for TASK-003.
- [ ] REST and MCP surfaces are behavior-identical, both delegating to the same service.

## Intended ADR

Record at Reconcile whether two separate link domains (task_links / story_links) vs one polymorphic link table is the confirmed structural choice — see implementation_plan.md § Planned ADRs.

---
## Implementation Report

**Date**: 2026-07-12

**What was done**:
Implemented the full `task_links` domain package as a new vertical slice following the established per-domain pattern. Created: `model.py` (TaskLink ORM model with two CASCADE FKs to `task.id`, uniqueness constraint, two directional indexes), `schema.py` (CreateTaskLink, TaskLink, EnrichedTaskLink, LinkedTaskSummary, PaginationMeta), `repository.py` (TaskLinkRepository extending BaseRepository with `find_duplicate`, `list_for_task`, `get_linked_task_summaries` batch-load, `delete_all_for_task`, `list_all_for_task`), `service.py` (TaskLinkService enforcing all five validation rules in correct precedence order), `controller.py` (two routers: `task_links_router` for POST/GET `/tasks/:taskId/links`, `task_links_top_router` for DELETE `/task-links/:id`), `mcp_tools.py` (three tools mirroring REST surface). Wired the service into `AppContainer`, added the MCP bridge `provide_task_link_service` to `mcp_dependencies.py`, added `AppPath.TASK_LINKS` to `routes.py`, mounted both routers in `router.py`, added `app.task_links` to the container wiring list in `main.py`. Created Alembic migration `0006_task_link` creating the `task_link` table with inline FK constraints and directional indexes. Registered `TaskLink` and `Task` models in `migrations/env.py`.

**Deviations from plan**:
None. Implemented exactly as specified.

**Technical decisions made**:
- The service returns `list[EnrichedTaskLink]` (Pydantic objects already constructed) from `list_for_task` and `list_all_enriched_for_task`; the controller calls `.model_dump()` directly without a redundant `model_validate` round-trip.
- `list_all_for_task` is a separate repository method that returns raw ORM `TaskLink` rows (no enrichment); the service's `list_all_enriched_for_task` wraps it and calls `_enrich_links`. This separates concern: TASK-003 can call either layer depending on what it needs.
- Migration registers the `TaskLink` and `Task` models in `env.py` (both were missing); this was necessary for Alembic autogenerate to work correctly for future migrations.

**Code locations**:
- `backend/app/task_links/` — full domain package (model, repository, service, schema, controller, mcp_tools, __init__)
- `backend/migrations/versions/0006_task_link.py` — schema migration
- `backend/migrations/env.py` — added TaskLink, Task, Milestone model imports
- `backend/app/container/container.py` — task_link_repository, task_link_service providers
- `backend/app/container/mcp_dependencies.py` — provide_task_link_service bridge
- `backend/app/api/routes.py` — AppPath.TASK_LINKS
- `backend/app/api/router.py` — task_links_router + task_links_top_router mounted
- `backend/app/main.py` — app.task_links added to wiring list

**Technical debt noted**:
- `list_all_for_task` and `delete_all_for_task` are created for TASK-003 consumption (cascade-delete and detail-composition wiring). They are tested indirectly through the delete-all scenario; direct unit tests will be added in TASK-007.

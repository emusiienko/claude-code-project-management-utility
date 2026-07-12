---
status: ToDo
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
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

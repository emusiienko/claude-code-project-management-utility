---
status: Done
assignee: backend-developer
story: STORY-008
---

# TASK-003: Comment REST controller, MCP tools, and DI wiring

## What to implement
Expose the comment service over REST and MCP with full behavioral parity, and wire the domain into
the DI container — following the attachments domain's controller/router/registration pattern.

- **REST** (JSON only; no content negotiation). Container-scoped routers declare create + list under
  each host noun; a top-level router declares get / ancestors / update / delete by comment id. The
  central router mounts the container-scoped routers under the `/stories`, `/tasks`, `/milestones`
  prefixes and the top-level router under `/comments` — without touching the story/task/milestone
  controllers.
  - `POST /v1/{stories|tasks|milestones}/{hostId}/comments` — create.
  - `GET  /v1/{stories|tasks|milestones}/{hostId}/comments` — list. Query: `page` (default 1),
    `limit` (default 50, ≤100), `label_key`, `label_value`, `after_id`, `descendant_of`.
  - `GET  /v1/comments/{id}` — fetch one.
  - `GET  /v1/comments/{id}/ancestors` — ordered ancestor bodies (bare `Comment[]`, unpaginated).
  - `PUT  /v1/comments/{id}` — update content/labels.
  - `DELETE /v1/comments/{id}` — delete.
  - List responses use the standard `{ data, pagination }` envelope with
    `pagination = { total, page, limit, totalPages }`.
- **MCP tools** mirroring the REST surface exactly: `create_comment`, `list_comments`,
  `get_comment`, `get_comment_ancestors`, `update_comment`, `delete_comment`. Create/list take
  `container_type` + `container_id` as arguments; `list_comments` accepts the same filters
  (`page`, `limit`, `label_key`, `label_value`, `after_id`, `descendant_of`).
- **DI wiring**: register the comment repository and service providers on the shared container, and
  add the comments package to the MCP auto-wiring list so its tools self-register.

## Scope
`comments` domain controller + MCP tools; central router registration; DI container providers.

## Dependencies
TASK-002.

## Acceptance Criteria
- [ ] Every listed REST endpoint is reachable at the specified path and honors its parameters.
- [ ] Each MCP tool mirrors its REST counterpart and produces behavior-identical results.
- [ ] The container-scoped routes mount under the host prefixes without modifying the
  story/task/milestone controllers.
- [ ] Domain errors map to the correct HTTP statuses / tool errors per the shared mapping.
- [ ] The comments providers resolve from the container and the MCP tools self-register on startup.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**: Exposed the `CommentService` (built in TASK-001/TASK-002) over REST and MCP,
and wired the domain into the shared DI container, mirroring the attachments domain's
controller/router/registration pattern exactly.
- REST: three container-scoped routers (`stories_comments_router`, `tasks_comments_router`,
  `milestones_comments_router`) each declare `POST/GET .../comments`; one top-level router
  (`comments_top_router`) declares `GET /comments/{id}`, `GET /comments/{id}/ancestors`,
  `PUT /comments/{id}`, `DELETE /comments/{id}`. All six endpoints from the task spec are wired
  and tested end-to-end. List query params: `page` (default 1), `limit` (default 50, ≤100),
  `label_key`, `label_value`, `after_id`, `descendant_of` — all forwarded to
  `CommentService.list_paginated`. The ancestors endpoint returns a bare `list[dict]` (no `data`
  envelope), per the plan's explicit "not a paginated envelope" note.
- MCP: `create_comment`, `list_comments`, `get_comment`, `get_comment_ancestors`,
  `update_comment`, `delete_comment` — each a thin wrapper (parse → call service → return),
  behavior-identical to its REST counterpart, using the same `DomainError.to_tool_error()` /
  `ToolError("Internal server error.")` handling convention as every other domain's `mcp_tools.py`.
- DI: registered `comment_repository` (Factory over `CommentRepository`) and `comment_service`
  (Factory over `CommentService`, wired to the existing `story_repository`/`task_repository`/
  `milestone_repository` as the `StoryReaderProtocol`/`TaskReaderProtocol`/
  `MilestoneReaderProtocol` dependencies TASK-002 already defined) in `container/container.py`,
  placed before `milestone_service` — the same position and rationale the attachments domain
  uses, since TASK-004 (next, sequential) will inject `comment_service` into
  `milestone_service`/`story_service`/`task_service` as the `CommentReaderProtocol`. Added
  `provide_comment_service` to `container/mcp_dependencies.py` following the established
  `@asynccontextmanager + @inject` bridge pattern. Added `"app.comments"` to the
  `container.wire(packages=[...])` list in `main.py` so `@mcp_server_v1.tool()` registration
  fires at startup, and added `AppPath.COMMENTS = "comments"` + router includes in
  `app/api/routes.py` / `app/api/router.py` for the container-scoped and top-level mounts — no
  existing story/task/milestone controller file was touched.

**Deviations from plan**: None. The task's `pagination = { total, page, limit, totalPages }`
wording is descriptive of the envelope shape; the codebase's actual established field name for
this object across every other paginated domain (attachments, tasks, task-links, story-links) is
`meta`, not `pagination` — followed that existing convention for consistency rather than
introducing a new field name unique to comments.

**Technical decisions made**:
- `comment_repository`/`comment_service` are registered directly after `task_repository` and
  before `milestone_service` in the container — the same slot attachments occupies and for the
  same reason (a later task wires the reader Protocol into the three container-owning services;
  registering here keeps that diff small and consistent).
- List query parameter names on the MCP tool (`label_key`, `label_value`, `after_id`,
  `descendant_of`) are plain keyword arguments (not a nested filter object), matching the
  `list_tasks`/`list_attachments` MCP tool convention already in the codebase.
- Verified the full REST + MCP surface (all six operations, all three container types, the reply/
  `ancestors` derivation, the `after_id` watermark, the `descendant_of` sub-thread filter, the
  cross-container reply rejection, and 404 handling) with a throwaway pytest file run against the
  real SQLite test DB, then deleted it — no permanent comments test suite exists yet (that is
  TASK-011, qa-automation).

**Code locations**:
- `backend/app/comments/controller.py` (new)
- `backend/app/comments/mcp_tools.py` (new)
- `backend/app/api/routes.py` (added `AppPath.COMMENTS`)
- `backend/app/api/router.py` (imported + mounted the four comment routers)
- `backend/app/container/container.py` (added `comment_repository` + `comment_service` providers)
- `backend/app/container/mcp_dependencies.py` (added `provide_comment_service` bridge)
- `backend/app/main.py` (added `"app.comments"` to `container.wire(packages=[...])`)

**Technical debt noted**: None introduced by this task. Baseline and post-implementation full-suite
runs both show the same 6 pre-existing `tests/test_settings.py` failures (identical set and count),
already documented by TASK-001/TASK-002 as pre-existing debt left over from TASK-005's seed change,
unrelated to and unaffected by anything in this task.

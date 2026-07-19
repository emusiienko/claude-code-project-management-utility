---
status: ToDo
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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

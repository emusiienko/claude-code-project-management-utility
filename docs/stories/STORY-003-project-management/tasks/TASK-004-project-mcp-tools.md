---
status: ToDo
assignee: backend-developer
story: STORY-003
---

# TASK-004: Project MCP tools

## What to implement

Expose the same five project operations as MCP tools on the shared FastMCP server, mirroring
the REST surface. Provide a `register_project_tools(mcp_server)` entrypoint following the
settings MCP pattern, and call it during server setup. The tools reuse the same project
service and the same schemas as REST so behavior is identical across both surfaces — no
duplicated logic.

Tools (names mirror the endpoints, per the contract's MCP mirroring rule):
- `create_project` — input `{ name; description? }`, returns the created project.
- `list_projects` — input pagination `{ page?; limit? }`, returns the paginated list with
  the same `meta` shape as REST.
- `get_project` — input `{ id }`, returns the project or a not-found tool error.
- `update_project` — input `{ id; name?; description? }`, returns the updated project.
- `delete_project` — input `{ id }`, deletes (cascade) and returns success.

Domain errors map to MCP tool errors with the same `code` as REST (`CONFLICT`, `NOT_FOUND`,
`VALIDATION_ERROR`), including the verbatim conflict message.

## Scope

`backend/app/projects/` (mcp_tools) and the MCP server registration.

## Dependencies

TASK-002.

## Acceptance Criteria

- [ ] All five tools are registered on the shared FastMCP server and use the project
      service (no logic in the tool layer).
- [ ] Tool inputs/outputs match the contract schemas; list output carries the same `meta`
      shape as REST.
- [ ] Duplicate-name create/update returns a `CONFLICT` tool error with the verbatim
      message; missing id returns `NOT_FOUND`; invalid input returns `VALIDATION_ERROR`.
- [ ] REST and MCP produce behavior-identical results for the same inputs.

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

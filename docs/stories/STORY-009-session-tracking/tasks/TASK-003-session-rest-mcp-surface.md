---
status: ToDo
assignee: backend-developer
story: STORY-009
---

# TASK-003: Session REST controller + MCP tools + DI wiring

## What to implement
Expose the sessions service through the two thin, behaviour-identical surfaces, and wire the domain into
the DI container.

REST controller (project-owned-entity convention — `project_id` in the create body; a **required**
`project_id` query param on the list; no cross-project listing):
- `POST /sessions` → 201 `Envelope<Session>` (422 validation; 404 for a missing project or link target).
- `GET /sessions?project_id&page&limit&incomplete&linked_story_id&include_archived` → 200
  `ListEnvelope<Session>`, newest-first. `project_id` is required; `incomplete` and `linked_story_id`
  are independently combinable; archived excluded unless `include_archived`.
- `GET /sessions/:id` → 200 `Envelope<Session>` (404).
- `PUT /sessions/:id` → 200 `Envelope<Session>` (422 / 404).
- `POST /sessions/:id/archive` → 200 `Envelope<Session>` (returns the updated record; 400 already
  archived; 404).

Entry layers pass string ids through (no UUID parsing at the boundary — the base repository coerces and
raises 404 on a malformed id). Field-level validation lives in the schemas.

MCP tools — five, mirroring the REST surface one-to-one over the same service, using the shared
`DomainError.to_tool_error()` mapping: `create_session`, `list_sessions`, `get_session`,
`update_session`, `archive_session`. `list_sessions(project_id, incomplete=true)` is the orchestrator's
cross-restart continuity query and must return correct results after a server restart (it is an ordinary
persisted query — no special handling, just verify it is not gated on any in-memory state).

DI wiring: add the session repository and session service providers to the shared `AppContainer`; add
the new sessions package to the MCP `container.wire(packages=[...])` registration list so its tools
self-register. (Injecting the session reference-cleaner into the stories/tasks services is TASK-004.)

## Scope
`backend/app/sessions/` (controller, mcp_tools), `backend/app/container/`, and the API/MCP router
registration shell.

## Dependencies
TASK-002

## Acceptance Criteria
- [ ] All five REST endpoints behave per the shapes above, using the standard envelopes and error codes;
      the list requires `project_id` and honours `incomplete` + `linked_story_id` + `include_archived`.
- [ ] Five MCP tools mirror the REST surface and are behaviour-identical over the shared service;
      `list_sessions` with the incomplete filter returns a project's incomplete, non-archived sessions.
- [ ] The sessions providers are registered on `AppContainer` and the package is wired for MCP tool
      registration.
- [ ] `POST /sessions/:id/archive` returns the updated session and yields 400 on an already-archived
      session.

## Intended ADR
None from this task.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

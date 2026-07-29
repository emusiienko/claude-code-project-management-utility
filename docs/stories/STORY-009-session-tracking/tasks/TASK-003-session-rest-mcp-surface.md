---
status: Done
assignee: backend-developer
story: STORY-009
---

# TASK-003: Session REST controller + MCP tools + DI wiring

> **Superseded in part by TASK-008 (2026-07-29):** the response no longer carries `is_complete` and
> always carries a non-null `status` enum; the `is_complete`-related update judgment call recorded below
> is moot once `is_complete` is removed. The endpoint shapes, DI wiring, and the `incomplete` list param
> (now meaning `status != finished`) are unchanged. This task's report stays as the record of the
> original build.

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
**Date**: 2026-07-29
**What was done**: Built `backend/app/sessions/controller.py` (5 REST routes: `POST /sessions`,
`GET /sessions` with required `project_id` query param plus `page`/`limit`/`incomplete`/
`linked_story_id`/`include_archived`, `GET /sessions/:id`, `PUT /sessions/:id`,
`POST /sessions/:id/archive`) and `backend/app/sessions/mcp_tools.py` (5 MCP tools —
`create_session`, `list_sessions`, `get_session`, `update_session`, `archive_session` —
behaviour-identical mirrors over the same `SessionService`, following the established
`DomainError.to_tool_error()` / logged-`ToolError` convention). Wired the domain into the shared
`AppContainer`: added `session_repository`/`session_service` Factory providers, declared right
after `task_repository` and before the Attachments domain block (the sessions service only needs
`project_repository`, `settings_service` (as `effective_dict`), `story_repository`, and
`task_repository` — all already declared above that point — as its `StoryReaderProtocol`/
`TaskReaderProtocol` dependencies). Added `provide_session_service` to
`container/mcp_dependencies.py` (identical bridge shape to every other domain). Added
`AppPath.SESSIONS = "sessions"` to `api/routes.py`, included `sessions_router` under that prefix
in `api/router.py`, and added `"app.sessions"` to the `container.wire(packages=[...])` list in
`main.py` so the MCP tools self-register.
**Deviations from plan**: None — surface, DI wiring, and error codes match the task spec exactly.
**Technical decisions made**: (1) Resolved the open judgment call left by TASK-002's Implementation
Report — whether an explicit `is_complete: null` on update should be rejected (422) or silently
treated as a no-op. Decided to **reject it as 422**, mirroring `topic`/`goal`/`participant_role`:
`is_complete` is a `NOT NULL` boolean column with no defined "clearing" semantics anywhere in the
story's AC/Edge-Cases, so an explicit `null` has no valid meaning and is more likely a client bug
than an intentional no-op; silently accepting it risks masking that bug. Implemented with the
exact same mechanism already used for `topic`/`goal`/`participant_role`: a `field_validator` on
`is_complete` that rejects `None` — Pydantic v2 only invokes field validators on an explicitly
supplied value (including an explicit `null`), never on an omitted field's default, so omission
still leaves `is_complete` unchanged while explicit `null` now raises a 422. No service-layer
change was needed since `SessionService.update`'s existing `if data.is_complete is not None`
check already treats "value is `None`" as "leave unchanged" — after this change that can only
mean "omitted." (2) Named the `sqlalchemy.orm.Session` import `DbSession` in `controller.py` to
avoid a real, non-cosmetic name collision with `app.sessions.schema.Session` (the response schema
happens to share the ORM library's session type name) — the domain's `Session` type is what every
other symbol in the file needs to refer to unqualified. (3) `list_sessions`' `project_id` is a
required `Query(...)` with no default, so FastAPI natively returns 422 when it is omitted, and
`SessionService.list_paginated` already 404s on an unknown `project_id` via the existing
`_assert_project_exists` — no new validation code needed in the controller.
**Code locations**: `backend/app/sessions/controller.py`, `backend/app/sessions/mcp_tools.py`,
`backend/app/container/container.py`, `backend/app/container/mcp_dependencies.py`,
`backend/app/api/routes.py`, `backend/app/api/router.py`, `backend/app/main.py`. The is_complete
judgment call is implemented in `backend/app/sessions/schema.py` (`UpdateSession`).
**Technical debt noted**: None. Verified via a temporary scratch test
(`tests/test_sessions_scratch.py`, removed after verification) exercising the full REST surface
end-to-end through the FastAPI test client (create happy path; missing/unknown `project_id`
404/422; invalid `participant_role` 422; get by id + 404; list requiring `project_id` (422 when
omitted) + pagination meta; partial update setting `is_complete` independently of result fields;
explicit-null 422 on `topic` and on `is_complete`; explicit-null clearing of `context`; linking to
a same-project story + the `linked_story_id` list filter; archive returning the updated record +
archived-exclusion from the default list + `include_archived` inclusion + continued editability
post-archive + 400 on a second archive) plus two MCP-surface checks (`list_tools()` confirms all
five tools self-registered via `container.wire()`; a `fastmcp.Client` round-trip across separate
`Client` contexts — `create_session` → `get_session` in a fresh context proves the DI bridge
actually committed → `list_sessions(incomplete=true)` → `update_session` flips it → the incomplete
list drops to zero → `archive_session`). `pyright app/sessions/ app/container/ app/api/
app/main.py` reports 0 errors. Full backend suite re-run before and after the change: 517 passed,
2 xfailed both times (identical to TASK-001/TASK-002's recorded baseline) — no regressions; the
new REST/MCP surface is not yet exercised by the permanent suite (that lands in TASK-007).

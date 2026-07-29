---
status: Done
assignee: qa-automation
story: STORY-009
---

# TASK-007: Write automated tests

## What to implement
Write automated tests covering the Sessions REST + MCP surface and the cross-domain reference-clearing
behaviour.

**Endpoints / operations (REST, each mirrored by its MCP tool):**
- `POST /sessions` — happy path (minimal: project_id + topic + goal + participant_role); with links; with
  context/status/result fields; validation failures (missing topic → 422; missing goal → 422; topic or
  goal outside 1–500 → 422; missing participant_role → 422; participant_role not in the project's
  effective dictionary → 422; missing project_id → 422; non-existent project_id → 404; link to a
  non-existent story/task → 404; link to a story/task in a different project → 422). Confirm `is_complete`
  is `false` on create and is ignored/rejected if supplied.
- `GET /sessions` — project-scoped list; `incomplete` filter; `linked_story_id` filter; both combined;
  `include_archived` behaviour; pagination + newest-first order; required `project_id`.
- `GET /sessions/:id` — found / 404.
- `PUT /sessions/:id` — omitted field unchanged; explicit-null clears `context`/`status`/result
  fields/link ids; explicit-null `topic`/`goal`/`participant_role` → 422; new `topic` and new `goal`
  (each re-validated length) and new `participant_role` (re-validated dictionary); setting `is_complete`
  true then false.
- `POST /sessions/:id/archive` — archives; second archive → 400 "Session is already archived."; an
  archived session is still updatable.

**Behaviors:**
- Completion is driven solely by `is_complete`: a session marked complete with both result fields null;
  a session still incomplete with both result fields set. Never inferred from result content.
- The incomplete-sessions query (`list_sessions` / `GET /sessions?incomplete=true`) returns exactly the
  project's non-archived incomplete sessions, and works after a fresh service/DB start (persistence, not
  in-memory state).
- A session with no linked story or task is valid (project link alone).

**Edge cases:**
- Deleting a linked story nulls `linked_story_id` (session retained); deleting a linked task nulls
  `linked_task_id` — assert on both SQLite and PostgreSQL if the suite runs both; if the SQLite FK gap
  is relevant, verify the application-level clearing (TASK-004) makes this pass on SQLite.
- Deleting a project deletes its sessions (note the SQLite `PRAGMA foreign_keys` divergence — align with
  how existing project-child cascade tests handle SQLite, e.g. xfail on SQLite / assert on PostgreSQL).
- REST and MCP produce equivalent results and equivalent error codes for the same operation.

## Scope
Backend API layer (REST) and MCP tools for the sessions domain, plus the story/task delete
reference-clearing behaviour.

## Dependencies
TASK-004 (implementation must be complete before tests can run green)

## Acceptance Criteria
- [ ] All listed endpoints, MCP tools, behaviours, and edge cases have at least one test.
- [ ] Tests pass against the running application (aligning SQLite cascade/SET-NULL expectations with the
      project's existing `PRAGMA foreign_keys` handling).

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-29
**What was done**: Wrote `backend/tests/test_sessions.py` — 60 integration tests covering the
full Sessions REST surface plus a representative REST/MCP parity subset: `POST /sessions`
(minimal happy path, with story+task links, with context/status, `is_complete` ignored at
create, missing/empty/too-long topic, missing/empty/too-long goal, missing/invalid
`participant_role`, missing `project_id`, non-existent `project_id`, link to a non-existent
story/task (404), link to a story/task in a different project (422)); `GET /sessions`
(requires `project_id`, project scoping, newest-first order, `incomplete` filter,
`linked_story_id` filter, both combined, `include_archived` default/true, pagination);
`GET /sessions/:id` (found, unknown 404, malformed-id 404); `PUT /sessions/:id` (omitted
field unchanged, explicit-null clears context/status/result fields/link ids, explicit-null
topic/goal/participant_role/is_complete → 422, new topic/goal re-validated for length, new
participant_role re-validated against the dictionary, `is_complete` true→false, unknown id
404); `POST /sessions/:id/archive` (happy path, second archive → 400 exact message, archived
session still updatable); completion-decoupled-from-result behaviors (complete with null
results, incomplete with both results set); an incomplete-query persistence check (two
independent HTTP requests — each resolving its own service/repository instance via the DI
container — see the same durable row, confirming the query is a plain persisted read with no
in-memory state); a session with no links is valid; reference-clearing on delete (deleting a
linked story/task nulls `linked_story_id`/`linked_task_id`, application-level, holds on
SQLite); project→session cascade delete (`xfail(strict=True)`, mirroring the existing
`TestCascadeDelete`/`TestTaskCascadeDelete` baseline — pending the standing
`PRAGMA foreign_keys = ON` fix); and 7 REST/MCP parity tests (`create_session`,
`create_session` with an invalid `participant_role` erroring identically, `get_session`
found + not-found, `list_sessions`, `update_session`, `archive_session` including the
double-archive 400 parity). Ran the new file in isolation (60 passed, 1 xfailed) and the
full backend suite (`577 passed, 3 xfailed`) — no regressions.
**Deviations from plan**: The strategy doc's stated scope is REST-only ("MCP: No — thin
wrappers, REST coverage is sufficient"), but this task's acceptance criteria explicitly
require "REST and MCP produce equivalent results and equivalent error codes for the same
operation." Resolved by adding a representative MCP-parity subset (`TestMcpParity`, 7 tests)
covering one success + one error case per MCP tool, using the existing
`fastmcp.Client(mcp_server_v1)` pattern already established in `test_settings.py` /
`test_attachments.py`, rather than a full MCP-mirrors-every-REST-case duplication — consistent
with "MCP smoke only if requested" in the strategy doc.
**Technical decisions made**: MCP tool responses for single-record operations
(`create_session`/`get_session`/`update_session`/`archive_session`) are wrapped in a `{"data":
...}` envelope identical to REST (unlike `settings` MCP tools, which return the raw dict) —
tests read `result.data["data"][...]`, matching the established `test_attachments.py`
convention. `list_sessions` mirrors the paginated `{"data": [...], "meta": {...}}` shape, read
via `result.data["data"]`. The project→session cascade test is `xfail(strict=True)` rather
than asserted, per the task's own guidance and the identical precedent in
`TestCascadeDelete`/`TestTaskCascadeDelete` — the story/task reference-clearing tests (a
distinct, application-level mechanism per TASK-004) are asserted as real passes since they do
not depend on the inert SQLite FK pragma.
**Code locations**: `backend/tests/test_sessions.py` (new file, ~1350 lines, 60 tests across
`TestCreateSession`, `TestListSessions`, `TestGetSession`, `TestUpdateSession`,
`TestArchiveSession`, `TestCompletionBehavior`, `TestIncompleteQueryPersistence`,
`TestSessionWithoutLinks`, `TestReferenceClearingOnDelete`, `TestProjectCascadeDelete`,
`TestMcpParity`).
**Technical debt noted**: None new. The pre-existing `PRAGMA foreign_keys = ON` gap (tracked
against `backend-developer`, already noted for stories/tasks cascade delete) now also covers
the sessions project-cascade test; no new debt introduced by this task.

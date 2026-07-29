---
status: ToDo
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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

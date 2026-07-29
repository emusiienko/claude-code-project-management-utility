---
status: ToDo
assignee: backend-developer
story: STORY-009
---

# TASK-002: Session service + schemas + cross-domain Protocols

## What to implement
The sessions service (single home of all business rules) and its Pydantic schemas.

Schemas (house naming — no `Body`/`Response` suffixes):
- `CreateSession` — `project_id`, `topic` (1–500), `goal` (1–500), `context?`, `status?`,
  `participant_role`, `linked_story_id?`, `linked_task_id?`. `is_complete` is intentionally **not** a
  create input.
- `UpdateSession` — `topic?`, `goal?`, `context?`, `status?`, `participant_role?`, `result_decisions?`,
  `result_summary?`, `is_complete?`, `linked_story_id?`, `linked_task_id?`. Distinguish "field omitted"
  from "field explicitly null": `context` / `status` / `result_decisions` / `result_summary` /
  `linked_story_id` / `linked_task_id` clear on explicit null; `topic`, `goal`, and `participant_role`
  are mandatory, so an explicit null is a validation error; a new `topic` and a new `goal` are each
  re-validated 1–500.
- `Session` — the full record including `goal`, `is_complete`, both link ids (raw, no enrichment),
  `archived_at`, and timestamps.

Service behaviour:
- **Create:** resolve the owning project (404 if it does not exist); validate `participant_role`
  against that project's effective `participant_roles` (422, message shape "Value '{v}' is not allowed.
  Allowed: {list}."); for each provided link id, validate the target exists (404) and belongs to the
  **same project** as the session (422). Force `is_complete = false`.
- **Update (partial):** apply only provided fields; re-validate a new `participant_role` against the
  effective dictionary; re-validate a new `topic`/`goal` as 1–500; reject an explicit-null
  `topic`/`goal`/`participant_role` as 422; re-validate a newly set link id for existence + same-project.
  `is_complete` is freely settable to `true` or `false`, independent of the result fields.
- **Archive:** set `archived_at`; a second archive of an already-archived session is a 400 ("Session is
  already archived."). Archiving does not restrict any later update.
- **Read:** single get by id (404 if absent); project-scoped paginated list delegating the
  incomplete / linked-story / include-archived conditions to the repository.

Cross-domain access: declare, **within the sessions service module**, the reader Protocols this service
needs — a story reader that resolves a story's owning project, and a task reader that resolves a task's
owning project (transitively via its story) — satisfied structurally by the existing story/task data
layer through the container. The sessions service must not import the stories or tasks packages. Also
declare the reference-cleaner Protocol the service itself satisfies (clear all session references to a
given story id / task id), to be consumed by the stories/tasks services in TASK-004.

## Scope
`backend/app/sessions/` (service, schema, and the module-local Protocol declarations).

## Dependencies
TASK-001

## Acceptance Criteria
- [ ] Create validates project existence (404), `topic` and `goal` length (1–500, 422),
      `participant_role` membership in the effective `participant_roles` (422), and each linked
      story/task's existence (404) + same-project membership (422); `is_complete` is always `false` on
      create and is not accepted as input.
- [ ] Update applies only provided fields; explicit null clears the clearable fields; explicit null on
      `topic`/`goal`/`participant_role` is a 422; a new `topic`/`goal` (re-validated 1–500) /
      `participant_role`/link id is re-validated; `is_complete` is settable both ways independently of
      the result fields.
- [ ] Result fields (`result_decisions`/`result_summary`) never affect `is_complete`, in any
      combination.
- [ ] Archive is idempotency-safe as a 400 error on an already-archived session; archived sessions
      remain updatable.
- [ ] The reader/cleaner Protocols are declared in the sessions module with no import of the stories or
      tasks packages.

## Intended ADR
See the plan's Planned ADRs — `participant_role` dictionary validation applies the established pattern;
no ADR is expected from this task.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

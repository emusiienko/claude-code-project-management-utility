---
status: Done
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
**Date**: 2026-07-29
**What was done**: Built `backend/app/sessions/schema.py` (`CreateSession`, `UpdateSession`,
`Session`, `PaginationMeta`) and `backend/app/sessions/service.py` (`SessionService` + the three
cross-domain Protocols). `CreateSession` requires `project_id`/`topic`/`goal`/`participant_role`
(1–500 length validators on `topic`/`goal`, non-empty on `participant_role`); `is_complete` is not a
field at all. `UpdateSession` makes every field optional; `topic`/`goal`/`participant_role` each carry
a field validator that rejects `None` — since Pydantic v2 does not invoke field validators on an
omitted field's default (only on an explicitly-supplied value, including an explicit `null`), this
single validator naturally distinguishes "omitted" (skips validation, stays `None`, service leaves the
field unchanged) from "explicit null" (validator fires, raises `422`) without any extra machinery. The
four other text fields, `linked_story_id`, and `linked_task_id` use the established
`model_fields_set` pattern (mirroring `UpdateTask`/`UpdateStory`) to distinguish omission from
explicit-null clearing. `SessionService.create` resolves the project (404), validates
`participant_role` against the project's effective `participant_roles` (422, "Value '{v}' is not
allowed. Allowed: {list}." — matching the `default_web_ui_role` message shape from the task spec, not
the `for field 'x'` variant tasks/story-links use), validates each provided link id's existence (404)
and same-project membership (422), and forces `is_complete=False`. `update` re-validates a new
`participant_role`/`topic`/`goal` the same way, applies `is_complete` independently of the result
fields, and re-validates a newly-set link id. `archive` raises a `ValidationError` (400) on an
already-archived session and leaves the record otherwise updatable. Declared
`StoryReaderProtocol`/`TaskReaderProtocol` (module-local, `TYPE_CHECKING`-guarded imports of
`StoryModel`/`TaskModel` only — no runtime import of `stories`/`tasks`) for link existence + owning-
project resolution — the task reader's project is resolved transitively by chaining
`task.story_id` through the same `StoryReaderProtocol` instance, exactly as the plan specified. Also
declared `SessionReferenceCleanerProtocol` (`clear_references_to_story`/`clear_references_to_task`),
implemented by `SessionService` itself by delegating to the TASK-001 repository's
`clear_linked_story`/`clear_linked_task`, for TASK-004 to consume from the stories/tasks services.
**Deviations from plan**: None.
**Technical decisions made**: Followed the task spec's literal message shape ("Value '{v}' is not
allowed. Allowed: {list}.", no `for field 'x'` clause) rather than the `tasks`/`story_links` variant
that includes the field name, since the task's Acceptance Criteria and the story's Edge Cases both
quote the field-name-less form verbatim ("the same validation convention used for
`default_web_ui_role`"). For `is_complete` (the first boolean field in this codebase's update
schemas), chose not to add a rejecting validator for an explicit `null` — the column is `NOT NULL`
with no clearing semantics described anywhere in the task/AC/edge-cases, so an explicit `null` is
treated identically to omission (left unchanged) rather than invented as a new 422 case; noted below
as a point QA/architect may want to make explicit at Reconcile if it matters.
**Code locations**: `backend/app/sessions/schema.py`, `backend/app/sessions/service.py`.
**Technical debt noted**: None. Verified via 12 temporary scratch tests (create happy path +
project-404 + invalid-role-422 + linked-story-wrong-project-422 + linked-task same-project/transitive-
project resolution + linked-task-not-found-404 + update partial/clearing/omission + update rejects
explicit-null topic (schema-level) + `is_complete` independence from result fields in both directions
+ archive idempotency (400 on second archive) + post-archive editability + the reference-cleaner pair
+ list filters (`incomplete_only`, `linked_story_id`, `include_archived`, default archived-exclusion)
combined and independently) exercising `SessionService` directly against a real SQLite session
(`session_factory` fixture) with project/story/task fixtures created through the existing REST
endpoints; the scratch file was removed after verification since TASK-002's deliverable is the
service/schema layer only (REST/MCP surface lands in TASK-003, the permanent automated suite in
TASK-007). `pyright app/sessions/` reports 0 errors. Full backend suite re-run after the change: 517
passed, 2 xfailed — identical to the pre-change baseline (the new module has no REST/MCP/DI wiring
yet, so it is not exercised by the existing suite). One open question surfaced for TASK-003/architect:
whether an explicit `is_complete: null` on update should be a 422 (mirroring `topic`/`goal`
/`participant_role`) rather than silently ignored — flagged above under Technical decisions, not
blocking.

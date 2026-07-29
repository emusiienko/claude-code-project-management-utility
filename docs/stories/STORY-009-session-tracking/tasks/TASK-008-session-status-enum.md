---
status: Done
assignee: backend-developer
story: STORY-009
---

# TASK-008: Replace `is_complete` + free-form `status` with a fixed `status` enum

## What to implement
Retire the `is_complete` boolean and the free-form `status` string across the whole sessions backend
slice, and replace them with a single required `status` lifecycle enum with exactly three fixed values:
`pending`, `in-progress`, `finished`. This is the backend delta for Revision 2 of the implementation
plan; it supersedes the completion model built in TASK-001/002/003.

**Enum semantics.**
- `pending` is the default at creation and is never a create input — every new session starts at
  `pending` regardless of the create payload. An incoming `status` in a create payload is accepted and
  ignored (not rejected).
- `status` is freely settable to any of the three values via update, in any direction — no transition
  order is enforced (consistent with this app's "stores facts, never enforces process" principle).
- `status` is mandatory and cannot be cleared: an explicit `null` on update is a 422.
- The enum is deliberately **not** dictionary-validated — it is a fixed, project-independent lifecycle,
  unlike `task_statuses`/`story_statuses`. Validate it at the schema layer (a fixed-set field
  validator), producing the 422 message
  `"Value '{v}' is not allowed. Allowed: pending, in-progress, finished."` for any value outside the set.
- Mapping for every place that previously read `is_complete`: incomplete = `status` is `pending` or
  `in-progress`; complete = `status` is `finished`.

**Data layer.**
- ORM model: `status` becomes a mandatory (`NOT NULL`) column with a DDL/server default of `pending`;
  remove the `is_complete` column. Re-key the incomplete-query index from `(project_id, is_complete)` to
  `(project_id, status)`; leave the other three indexes unchanged.
- Migration: **amend `0013_session` in place** — do not add a new revision. The `session` table exists
  only on this unmerged feature branch (no released/production DB has it), so this is the project's
  established pre-production in-place-edit situation. Keep the revision id and down-revision unchanged.
  The amended migration creates `session` with `status NOT NULL` (server default `pending`), without the
  `is_complete` column, and with the `(project_id, status)` index in place of `(project_id, is_complete)`.
  A local dev DB that already has the old `0013` applied must be recreated (fresh volume, or
  downgrade-then-upgrade) — call this out so the developer running it knows.
- Repository: the incomplete-only list condition changes from "`is_complete` is false" to "`status` is
  not `finished`". The reference-clearing operations and the rest of the list surface are unchanged.

**Service.**
- Create: force `status = pending`; remove all `is_complete` handling. All other create validation
  (project existence, `participant_role` dictionary check, link existence + same-project membership) is
  unchanged.
- Update: apply a provided `status` after schema validation; remove all `is_complete` handling. The
  `status` mandatory/cannot-clear rule is enforced at the schema layer alongside `topic`/`goal`/
  `participant_role`; the service simply assigns a provided value.

**Schemas.**
- Create schema: remove `status` and any `is_complete` notion — neither is a create input.
- Update schema: `status` is optional-to-omit but present-but-`null` is a 422 and any non-enum value is a
  422 (fixed-set validator); remove `is_complete` entirely.
- Response schema: `status` is a required, non-null enum value; remove `is_complete`.

**REST + MCP surfaces.** Endpoint shapes and the `incomplete` list query param are unchanged — its
semantics become "`status != finished`". Responses no longer carry `is_complete` and always carry a
non-null `status`. Keep REST and MCP behaviour-identical over the one service.

## Scope
`backend/app/sessions/` (model, repository, service, schema, controller, mcp_tools) and
`backend/migrations/versions/0013_session.py`.

## Dependencies
None (modifies the already-built sessions slice; no other task must precede it).

## Acceptance Criteria
- [ ] The `session` table has a mandatory `status` column (default `pending`) and no `is_complete`
      column; migration `0013_session` is amended in place and round-trips cleanly on SQLite and
      PostgreSQL.
- [ ] Creating a session always yields `status: pending`; a `status` supplied in the create payload is
      ignored, and no create path accepts `is_complete`.
- [ ] Updating `status` to any of `pending` / `in-progress` / `finished` succeeds in any direction;
      an explicit `null` `status` is a 422; a value outside the set is a 422 with the message
      `"Value '{v}' is not allowed. Allowed: pending, in-progress, finished."`.
- [ ] `status` is fully independent of `result_decisions`/`result_summary` in every combination.
- [ ] The `incomplete=true` list filter returns exactly the project's non-archived sessions whose
      `status` is `pending` or `in-progress`.
- [ ] Session responses (REST and MCP) carry a non-null `status` and no `is_complete` field; REST and MCP
      stay behaviour-identical.

## Intended ADR
None created now. The completion-model decision (fixed enum, not dictionary-validated) is recorded in
the plan's "Planned ADRs" and becomes an ADR at Reconcile.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-29

**What was done**: Retired `is_complete` and the free-form `status` string across the whole sessions
backend slice, replacing them with a single mandatory `status` column restricted to the fixed set
`pending` / `in-progress` / `finished`.
- `model.py`: dropped the `is_complete` `Boolean` column; `status` is now `Mapped[str]`, `String(20)`,
  `nullable=False`, `default="pending"` / `server_default="pending"` (literal default, matching the
  established `MILESTONE_STATUS_*`-style convention rather than importing a schema constant into the
  data layer). Re-keyed the incomplete-query index from `ix_session_project_complete
  (project_id, is_complete)` to `ix_session_project_status (project_id, status)`; the other three
  indexes are unchanged.
- `backend/migrations/versions/0013_session.py`: amended in place (revision id and down-revision
  unchanged) — `status` column is now `String(20) NOT NULL server_default='pending'`, the `is_complete`
  column is gone, and the index is renamed/re-keyed to `ix_session_project_status` on
  `(project_id, status)` in both `upgrade()` and `downgrade()`. Docstring updated to explain the
  in-place edit and the pre-production justification. Verified a clean upgrade → downgrade → upgrade
  round-trip on SQLite (manual check against a scratch DB, outside the pytest suite).
- `repository.py`: `list_paginated`'s `incomplete_only` branch now filters
  `Session.status != SESSION_STATUS_FINISHED` instead of `Session.is_complete.is_(False)` (imports the
  constant from `schema.py`, mirroring the existing `MILESTONE_STATUS_ACTIVE` import precedent in
  `milestones/repository.py`).
- `schema.py`: added `SESSION_STATUS_PENDING` / `SESSION_STATUS_IN_PROGRESS` / `SESSION_STATUS_FINISHED`
  / `ALL_SESSION_STATUSES` (ordered tuple, drives the 422 message text). `CreateSession` no longer has a
  `status` field at all (Pydantic's default `extra="ignore"` behaviour means an incoming `status` in a
  create payload is silently dropped, satisfying "accepted and ignored, not rejected" without any extra
  code). `UpdateSession` keeps `status: str | None = None` with a new `status_valid_when_present`
  validator: explicit `null` raises "status cannot be null." (422); any value outside the fixed set
  raises the exact message `"Value '{v}' is not allowed. Allowed: pending, in-progress, finished."`;
  omission leaves it unvalidated/unchanged, following the identical mechanism already used for
  `topic`/`goal`/`participant_role`. Removed `is_complete` entirely from both request schemas. Response
  `Session.status` is now `str` (was `str | None`); `is_complete` removed.
- `service.py`: `create()` now hardcodes `status=SESSION_STATUS_PENDING` instead of `data.status` (the
  field no longer exists on `CreateSession` regardless); `update()` dropped the `is_complete` handling
  block — the pre-existing `if "status" in data.model_fields_set: session.status = data.status` line
  needed no change since schema-layer validation already fully enforces the mandatory/non-null/enum
  rule before the service ever sees the value.
- `controller.py`/`mcp_tools.py`: no changes needed — both are thin `Session.model_validate(...)` passes
  over the schema, so the shape change (drop `is_complete`, `status` now required non-null) flows
  through automatically; REST and MCP stay behaviour-identical.

**Deviations from plan**: None. Followed the task file and Revision 2 of `implementation_plan.md`
exactly — schema-layer enum validation, service forces `pending` at create, migration amended in place,
same revision id/down-revision.

**Technical decisions made**:
- Chose `String(20)` for the `status` column (down from the old `status` column's `String(200)`) since
  the enum is now a small, permanently fixed set (`in-progress` is the longest value at 11 chars) —
  consistent with amending the migration in place rather than preserving the old column width.
- Kept the literal string `"pending"` as the model-layer default (not an import of
  `SESSION_STATUS_PENDING` from `schema.py` into `model.py`) to match the existing convention in
  `milestones/model.py` (`default="planned"` as a literal, with the dictionary constant living only in
  `schema.py`/service/repository) — avoids the data layer depending on the request/response schema layer.
- `CreateSession` has no `status` field at all rather than a field with a validator that always
  overwrites to `pending`; this is simpler and the spec explicitly allows "accept-and-ignore" for a
  create-time `status`.

**Code locations**:
- `backend/app/sessions/model.py`
- `backend/app/sessions/repository.py`
- `backend/app/sessions/service.py`
- `backend/app/sessions/schema.py`
- `backend/migrations/versions/0013_session.py`
- (`controller.py`/`mcp_tools.py` unchanged — confirmed no `is_complete`/status-shape-specific code exists
  there)

**Technical debt noted**: `backend/tests/test_sessions.py` (owned by qa-automation) still exercises the
retired `is_complete`/free-form-`status` model and now fails 14 tests that assert that old behavior
(`test_happy_path_minimal_returns_201`, `test_happy_path_with_context_and_status_returns_201`,
`test_is_complete_ignored_when_supplied_at_create`, `test_incomplete_filter`,
`test_incomplete_and_linked_story_id_combined`, `test_explicit_null_clears_status`,
`test_is_complete_true_then_false`, `test_explicit_null_is_complete_returns_422`,
`test_update_unknown_id_returns_404`, `test_archived_session_still_updatable`,
`test_complete_with_null_result_fields`, `test_incomplete_with_both_result_fields_set`,
`test_mcp_create_session_matches_rest`, `test_mcp_update_session_matches_rest`). This is the expected,
intentional split the architect called out in Revision 2 of the implementation plan and in this task's
own scope note — test-file updates are TASK-010 (qa-automation), not this task's scope or
document-ownership. All 563 other backend tests plus 3 xfailed remain green; the full 580-test baseline
run before this change was 577 passed + 3 xfailed with zero failures. Once TASK-010 lands the suite
should return to fully green.

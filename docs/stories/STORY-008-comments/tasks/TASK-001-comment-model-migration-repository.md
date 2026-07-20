---
status: Done
assignee: backend-developer
story: STORY-008
---

# TASK-001: Comment model, migration, and repository

## What to implement
Create the data layer for a new `comments` domain, structurally mirroring the `attachments` domain.

- A polymorphic, FK-less container model: a `container_type` discriminator over story / task /
  milestone plus a `container_id`. The comment carries `content` (Markdown, 1–50,000 chars), a
  required `author_role`, free-form `labels` (key/value pairs), an `ancestors` materialized path,
  and creation/update timestamps. Ids are UUIDs, consistent with every other entity.
- `ancestors` is an ordered (root-first) list of ancestor comment ids, stored as a JSON array;
  empty for a top-level comment. Ancestor ids are held FK-less (no DB-level referential integrity),
  consistent with the polymorphic-container convention.
- A composite index over `(container_type, container_id, created_at)` to back chronological listing.
- The `0011` Alembic migration creating the table, inline-FK-free per the migration convention
  (the container reference and ancestor ids are deliberately FK-less). No seed data.
- A repository providing: container-scoped `list_paginated` (oldest-first) supporting a label-key
  filter, a label-value filter, an ancestors-contains filter (returns the sub-thread beneath a given
  comment), and an `after_id` watermark applied as a keyset predicate on `(created_at, id)`; single
  fetch / insert / update / delete; a `list_by_ids` ordered-fetch helper; and a cascade pair
  (`list_all_for_container` + `delete_all_for_container`).
- Reuse the shared dialect-aware JSON-array filter helper for label and ancestors-contains filters,
  and keep string→UUID coercion in the shared base repository.

## Scope
New `comments` domain: model, migration, repository. No service/controller/MCP in this task.

## Dependencies
None.

## Acceptance Criteria
- [ ] The comment table exists via the `0011` migration and applies cleanly on both SQLite and
  PostgreSQL as part of a full clean-install migration run.
- [ ] The model stores `container_type`, `container_id`, `content`, `author_role`, `labels`,
  `ancestors`, and timestamps, with the chronological composite index present.
- [ ] `list_paginated` returns oldest-first and honors label-key, label-value, ancestors-contains,
  and `after_id` filters, alone and in combination.
- [ ] `list_by_ids` returns the requested comments and preserves a caller-supplied order.
- [ ] The cascade pair enumerates and removes all comments for a container.
- [ ] Label and ancestors-contains filtering behave identically on SQLite and PostgreSQL.

## Intended ADR
None directly (the persisted `ancestors` decision is recorded as a Planned ADR in the
implementation plan; the ADR file is created at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**: Built the `comments` domain data layer, structurally mirroring `attachments`:
- `Comment` ORM model — polymorphic FK-less `container_type`/`container_id`; `content` (Text,
  NOT NULL — length/emptiness validated at the schema layer in TASK-002, not the DB); required
  `author_role`; `labels` JSON array (default `[]`); `ancestors` JSON array (default `[]`, the
  materialized reply path); timestamps. Composite index `ix_comment_container_created` on
  `(container_type, container_id, created_at)` backs chronological listing.
- `0011_comment` Alembic migration — creates the `comment` table (portable `String(36)` id/
  `container_id` DDL, no FK on `container_id`), creates the composite index, no seed data.
  Registered `Comment` in `migrations/env.py`'s model-import list (required for Alembic
  autogenerate metadata registration, same pattern as every prior domain).
- `CommentRepository` (extends `BaseRepository[Comment]`) — `coerce_container_id`;
  `list_paginated` (oldest-first, container-scoped) supporting label-key/label-value filters
  (existing `apply_json_array_filter` helper), a `descendant_of_filter` (ancestors-contains
  sub-thread filter), and an `after_id_filter` keyset watermark on `(created_at, id)`, freely
  combinable; `list_by_ids` (ordered fetch, preserves caller order, skips missing ids); the
  cascade pair `list_all_for_container` / `delete_all_for_container`.
- New shared helper `apply_json_scalar_array_contains_filter` in
  `app/core/database/json_utils.py` — dialect-aware (SQLite `json_each` / PostgreSQL
  `jsonb_array_elements_text`) filter for "does this JSON array of scalar strings contain value
  X", distinct from the existing `apply_json_array_filter` (key/value object-fragment matching
  used for labels). Backs the `ancestors`-contains sub-thread filter; reusable by any future
  domain needing a plain-scalar JSON-array containment filter.

**Deviations from plan**: None from this task's scope. (The story-level "persisted `ancestors`
materialized path" design, itself a deviation from `description.md`'s schema-free
prepend-to-content mechanism, was already decided by the architect in `implementation_plan.md`
— this task implements that decision, it does not introduce it.)

**Technical decisions made**:
- `after_id` not-found is raised as `NotFoundError` directly from the repository (mirroring the
  existing precedent in `settings/repository.py`'s project-existence check), rather than
  requiring the service to pre-fetch the anchor row — keeps the keyset-resolution logic
  co-located with the query that needs it, and is consistent with `BaseRepository._coerce_uuid`
  already raising `NotFoundError` from the data layer for malformed ids.
- `after_id`'s anchor lookup is scoped to the same `container_type`/`container_id` as the list
  (not a bare global id lookup), since the watermark only makes sense within the same
  chronological list it is used to paginate.
- List ordering is `(created_at ASC, id ASC)` (not just `created_at ASC` as tasks/attachments
  do) — the secondary `id` tiebreaker is required for a stable, deterministic order that matches
  the `after_id` keyset predicate exactly, including when multiple comments share a timestamp.
- `list_by_ids` silently drops ids with no matching row (returns fewer rows than requested)
  rather than raising — matches the plan's explicit "readers degrade gracefully" contract for
  FK-less ancestor ids.

**Code locations**:
- `backend/app/comments/__init__.py`, `backend/app/comments/model.py`,
  `backend/app/comments/repository.py`
- `backend/migrations/versions/0011_comment.py`
- `backend/migrations/env.py` (added `Comment` import)
- `backend/app/core/database/json_utils.py` (added `apply_json_scalar_array_contains_filter` +
  its two dialect-specific helpers)

**Technical debt noted**:
- None introduced by this task. Note for the record (not a defect in this task's own work): a
  parallel, independent, in-progress edit to `app/settings/*` and
  `migrations/versions/0002_settings.py` (STORY-008 TASK-005, being implemented concurrently by
  another agent instance) was present in the working tree throughout this task and currently
  leaves `tests/test_settings.py` with 6 failing tests (confirmed via isolated `test_settings.py`
  runs with and without the comments-domain changes present — the failure count and set are
  identical either way). This is unrelated to and unaffected by anything in this task; flagging
  it here only so a later reconcile/QA pass doesn't misattribute it. The `comments` domain
  package added by this task touches no other domain and was verified against a scratch
  migration+repository script (alembic upgrade/downgrade round-trip + all filter/cascade
  behaviors) since no comments test suite exists yet (that is TASK-011, qa-automation).

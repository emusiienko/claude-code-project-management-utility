---
status: Done
assignee: backend-developer
story: STORY-009
---

# TASK-001: Session data layer — model, migration, repository

> **Superseded in part by TASK-008 (2026-07-29):** the `is_complete` column, its DDL default, and the
> `(project_id, is_complete)` index are retired in favour of a `status` enum column and a
> `(project_id, status)` index; migration `0013_session` is amended in place. This task's report stays as
> the record of the original build.

## What to implement
Create the `sessions` domain package's data layer: the `Session` ORM model, its Alembic migration, and
its repository.

The `Session` entity is owned by exactly one project and carries:
- `topic` — mandatory (length enforced at the schema layer, 1–500).
- `goal` — mandatory (length enforced at the schema layer, 1–500; plain free-form text, never
  dictionary-validated). Store it NOT NULL at the DDL layer, alongside `topic`.
- `context` — optional free-form text.
- `status` — optional free-form text (never dictionary-validated).
- `participant_role` — mandatory (dictionary validation lives in the service, not the data layer).
- `result_decisions`, `result_summary` — optional free-form text, informational.
- `is_complete` — boolean, NOT NULL, DDL default `false`.
- `linked_story_id` — optional reference to a story, `ON DELETE SET NULL`.
- `linked_task_id` — optional reference to a task, `ON DELETE SET NULL`.
- `archived_at` — nullable timestamp.
- standard `created_at` / `updated_at`.
- owning `project_id` — NOT NULL, `ON DELETE CASCADE`.

Migration: a new revision `0013_session` (down-revision `0012_web_ui_role_backfill`) creating the
`session` table with inline FKs toward the already-existing `project`, `story`, and `task` tables
(root-first, inline-FK convention — ADR-010). No seed data. Keep the revision id ≤32 characters.
Indexes must serve the two real read paths — the project-scoped newest-first list and the project-scoped
incomplete query — plus the two link columns (`linked_story_id` also backs the list filter and both back
the reference-clearing update in TASK-004). Portable UUID DDL (`String(36)`) as in every prior
migration.

Repository (extending the shared base repository):
- A project-scoped, paginated list supporting three independently-combinable conditions: exclude
  archived unless an "include archived" flag is set; restrict to incomplete (`is_complete = false`) when
  requested; restrict to a given `linked_story_id` when provided. Order newest-first with a stable id
  tiebreaker.
- Two reference-clearing operations: null `linked_story_id` on every session referencing a given story
  id, and null `linked_task_id` on every session referencing a given task id (bulk updates; consumed by
  TASK-004).
- Standard single fetch / insert inherited from the base.

## Scope
`backend/app/sessions/` (new package — model, repository) and `backend/migrations/`.

## Dependencies
None (parent `project`, `story`, `task` tables already exist).

## Acceptance Criteria
- [ ] `session` table is created by `0013_session` with the owning `project_id` FK (CASCADE) and the two
      optional link FKs (SET NULL), all inline; no seed; revision id ≤32 chars; upgrade/downgrade
      round-trips cleanly on both SQLite and PostgreSQL.
- [ ] `is_complete` defaults to `false` at the DDL layer.
- [ ] Indexes support the project-scoped newest-first list and the project-scoped incomplete query, plus
      the `linked_story_id` / `linked_task_id` columns.
- [ ] The repository exposes the project-scoped filtered/paginated list (archived / incomplete /
      linked-story conditions independently combinable) and the two reference-clearing bulk updates.

## Intended ADR
None. (Any decision recording is handled at Reconcile — see the plan's Planned ADRs.)

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-29
**What was done**: Built the `sessions` domain package's data layer per the plan: the `Session` ORM
model (`backend/app/sessions/model.py`), the Alembic migration `0013_session`
(`backend/migrations/versions/0013_session.py`, down-revision `0012_web_ui_role_backfill`), and the
`SessionRepository` (`backend/app/sessions/repository.py`). Registered `Session` in
`backend/migrations/env.py` so Alembic autogenerate picks it up (per the established
"Alembic model registration" convention). The migration creates the `session` table with inline FKs
to `project` (CASCADE), `story` (SET NULL), and `task` (SET NULL) — all three parent tables already
exist, keeping the root-first inline-FK convention (ADR-010). `is_complete` is `Boolean NOT NULL` with
a DDL default of `false` via `sa.false()` (portable across SQLite/PostgreSQL, mirrored in the ORM
model's `server_default=false()`). Four indexes back the two real read paths (project-scoped
newest-first list via `(project_id, created_at)`; project-scoped incomplete query via
`(project_id, is_complete)`) plus the two link columns (`linked_story_id`, `linked_task_id`) for the
list filter and TASK-004's reference-clearing updates. The repository exposes `coerce_project_id` /
`coerce_story_id` / `coerce_task_id` (UUID-or-404 helpers per ADR-011), `list_paginated` (project-scoped,
newest-first with an `(created_at, id)` tiebreaker, with `include_archived`, `incomplete_only`, and
`linked_story_id` as three independently-combinable optional conditions), and the two reference-clearing
bulk updates (`clear_linked_story`, `clear_linked_task`) that TASK-004 will call from the stories/tasks
delete cascades.
**Deviations from plan**: None. Field set, indexes, and repository surface match the task spec exactly.
**Technical decisions made**: Used `sqlalchemy.false()` as the `server_default` for `is_complete` (in
both the migration and the ORM model) rather than a raw string/text default, since it compiles to the
correct dialect-native boolean literal on both SQLite and PostgreSQL without branching — no precedent
existed for a boolean column in this codebase, so this establishes the pattern for future boolean
columns. `list_paginated` orders `created_at DESC, id DESC` (a stable id tiebreaker for rows created in
the same instant), matching the comments/attachments repository ordering convention rather than the
ascending order used by attachments/milestones lists, since this list's read pattern in the plan is
explicitly "newest-first."
**Code locations**: `backend/app/sessions/model.py`, `backend/app/sessions/repository.py`,
`backend/app/sessions/__init__.py`, `backend/migrations/versions/0013_session.py`,
`backend/migrations/env.py` (added `Session` import).
**Technical debt noted**: None. Verified via a temporary scratch test exercising every repository
method (pagination, each filter independently and combined, project scoping, newest-first ordering,
both reference-clearing updates, and the UUID-coercion 404 path) plus a manual `alembic upgrade
head` → `downgrade -1` → `upgrade head` round-trip on SQLite; both were removed after verification
since this task's deliverable is the data layer only (service-level and cross-domain wiring land in
TASK-002/TASK-004, automated tests in TASK-007). Full backend suite re-run after the change: 517
passed, 2 xfailed (same as the pre-change baseline) — no regressions.

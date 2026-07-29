---
status: ToDo
assignee: backend-developer
story: STORY-009
---

# TASK-001: Session data layer — model, migration, repository

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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

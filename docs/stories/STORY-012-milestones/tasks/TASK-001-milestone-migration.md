---
status: Done
assignee: backend-developer
story: STORY-012
---

# TASK-001: Milestone table migration + deferred story FK

## What to implement

Add one Alembic migration, chained after the current head, that:

- Creates the `milestone` table with: id (UUID), `project_id` (FK → project, `ON DELETE CASCADE`,
  declared inline toward the already-existing `project` table per the root-first inline-FK rule),
  `name`, `description`, `status` (defaulting to `planned`), and created/updated timestamps.
- Enforces name uniqueness within a project, case-insensitively, using the same portable
  `LOWER(name)` functional-uniqueness approach used for project names (scoped to `project_id`).
- Creates the milestone indexes: `(project_id)` and `(project_id, status)`.
- Adds the previously-deferred foreign key on the existing `story.milestone_id` column pointing to
  `milestone.id` with `ON DELETE SET NULL`. This resolves ADR-013. Because SQLite cannot
  `ALTER TABLE ADD CONSTRAINT`, add this FK portably so SQLite rebuilds the table while PostgreSQL
  emits a plain `ADD CONSTRAINT`.

No seed data — milestones are optional and user-created.

## Scope

`backend/migrations/` — one new revision. The migration runs unchanged on both SQLite and PostgreSQL.

## Dependencies

None.

## Acceptance Criteria

- [ ] `milestone` table created with single `project_id` FK (`ON DELETE CASCADE`), `status` column
      defaulting to `planned`, and both indexes
- [ ] Milestone name is unique case-insensitively within a project
- [ ] `story.milestone_id` gains its FK to `milestone.id` with `ON DELETE SET NULL`
- [ ] Migration applies cleanly on both SQLite (WAL) and PostgreSQL from an empty database and from
      the current head
- [ ] No `milestone_project` join table is created (single-project model)

## Intended ADR

See implementation_plan.md "Planned ADRs" — the M:N → single-project + lifecycle model change (ADR
created at Reconcile, not now).

---
## Implementation Report

**Date**: 2026-07-10

**What was done**: Created Alembic revision `0004_milestone` (chained after `0003_story`) that:
1. Creates the `milestone` table with `id` (String(36) PK), `project_id` (inline FK → project, ON DELETE CASCADE), `name`, `description`, `status` (VARCHAR(20), server_default `'planned'`), `created_at`, `updated_at`.
2. Creates three indexes: `ix_milestone_project_id` (project_id), `ix_milestone_project_status` (project_id, status), `ix_milestone_project_name_lower` (project_id, LOWER(name), unique) — enforcing case-insensitive name uniqueness within a project.
3. Adds the deferred `story.milestone_id → milestone.id` FK (ON DELETE SET NULL) via `batch_alter_table`, which rebuilds the table on SQLite (the only portable way to add a FK) and emits `ALTER TABLE ADD CONSTRAINT` on PostgreSQL, resolving ADR-013.

Migration was verified: `alembic upgrade head` from empty database succeeds; `downgrade` then `upgrade` roundtrip also clean. Full test suite: 150 passed, 1 xfailed (identical to pre-implementation baseline — no regressions).

**Deviations from plan**: None.

**Technical decisions made**:
- `status` column uses `server_default="planned"` (string) in DDL rather than relying on the ORM layer — this ensures the default is applied even for direct SQL inserts (e.g. future migrations), matching the approach used for other server-owned defaults.
- The `batch_alter_table` constraint is named `fk_story_milestone_id` explicitly so that `downgrade()` can drop it by name portably.

**Code locations**: `backend/migrations/versions/0004_milestone.py`

**Technical debt noted**: None. The `env.py` import of the `Milestone` ORM model will be added in TASK-002 when the model is created.

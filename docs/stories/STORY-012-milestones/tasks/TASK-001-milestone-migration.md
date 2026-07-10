---
status: ToDo
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
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

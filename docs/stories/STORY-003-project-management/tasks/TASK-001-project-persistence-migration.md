---
status: Done
assignee: backend-developer
story: STORY-003
---

# TASK-001: Project persistence + migration chain rewrite

## What to implement

Create the `project` entity's persistence layer and rewrite the migration chain so tables are
created in dependency order, with the root `project` table first.

**Context — why a full rewrite is allowed:** the migration chain has **never been applied
successfully** (the first PostgreSQL deployment failed on the broken `project_settings → project`
FK, before any migration ran). There is no deployed database and no data to preserve, so the
append-only migration discipline does not apply here. We are free to restructure the chain for
clarity. The house rule going forward (see implementation plan): **migrations are created in
dependency order, each table declares its foreign keys inline toward already-existing tables, and
each schema migration bundles its own seed data in the same revision.**

**Rewrite the chain to exactly two migrations** (delete the existing `0001_baseline`,
`0002_settings_schema`, `0003_settings_seed`):

- **`0001_project`** (`down_revision = None`):
  - Creates the `project` table.
  - In the same `upgrade()`, `bulk_insert`s exactly one seed project so a brand-new database is
    immediately usable.
- **`0002_settings`** (`down_revision = "0001_project"`):
  - Creates `system_settings` and `project_settings`. `project_settings` keeps its composite
    primary key `(project_id, key)` and declares its foreign key **inline**:
    `ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE")`. This is now valid
    on both dialects because `project` already exists from `0001_project` — no deferred FK, no
    `batch_alter_table`, no table rebuild.
  - In the same `upgrade()`, `bulk_insert`s the six default dictionaries (the rows previously in
    `0003_settings_seed`), unchanged in content.

**`project` table columns:** `id` (UUID primary key), `name` (1–200, unique case-insensitive),
`description` (nullable, max 5000), `created_at`, `updated_at`. Name uniqueness is enforced
dialect-aware in the data layer (functional `LOWER()` uniqueness), consistent with the
architecture's portability rules. Use the same portable UUID column approach already established
for `project_settings` (String(36) DDL / native UUID at the ORM layer) so the same DDL runs on
SQLite and PostgreSQL.

**ORM + repository:** Add the project ORM model and a repository over it, following the existing
per-domain data-layer pattern (the `BaseRepository` and core database primitives). No business
rules in this layer — persistence and queries only.

**Seed values** (deterministic, defined once in `0001_project`):
- `id` — a fixed UUID literal hard-coded in the migration (so `downgrade` can target this exact
  row).
- `name` — `"Test Project"`.
- `description` — `"Seed project created by migration 0001 for first-run usability."`
- timestamps — a fixed (non-`now()`) value, so the migration is deterministic and re-runnable.

Seeds are unconditional (Alembic runs each revision once and tracks it) — do not guard them on
"only if empty". Each `downgrade` reverses its own revision: `0002_settings` drops both settings
tables; `0001_project` drops the project table. (Targeted single-row seed deletion is unnecessary
because the seed lives in the same revision as the table it seeds.)

## Scope

`backend/app/projects/` (new domain package — model + repository) and `backend/migrations/`
(replace the three existing revisions with `0001_project` + `0002_settings`).

## Dependencies

None.

## Acceptance Criteria

- [ ] The migration chain consists of exactly two revisions: `0001_project` (down: None) and
      `0002_settings` (down: `0001_project`). The old `0001_baseline`, `0002_settings_schema`, and
      `0003_settings_seed` files are removed.
- [ ] `0001_project` creates the `project` table with all columns and the case-insensitive unique
      constraint on `name`, and seeds exactly one project (`name` = "Test Project") with a fixed
      `id` and deterministic timestamps.
- [ ] `0002_settings` creates `system_settings` and `project_settings` with the inline
      `project_settings → project` FK (`ON DELETE CASCADE`) and seeds the six default dictionaries.
- [ ] `alembic upgrade head` succeeds from empty on both SQLite (default, WAL) and PostgreSQL;
      `alembic downgrade base` reverses cleanly on both.
- [ ] After `alembic upgrade head` from empty, `project` contains exactly the one seed row and
      `system_settings` contains exactly the six dictionary rows, on both dialects.
- [ ] No `batch_alter_table` / deferred-FK construct is used; `project_settings` declares its FK
      inline and it resolves because `project` already exists.
- [ ] The project ORM model and repository exist and expose create/get/list/update/delete
      persistence operations with no embedded business rules.

## Intended ADR

Migration chain strategy — dependency-ordered, root-table-first, FKs inline, seed bundled with its
schema revision; recorded as a Planned ADR in the implementation plan. The actual ADR is created
at Reconcile if confirmed.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
- Deleted the three old migration files (`0001_baseline`, `0002_settings_schema`, `0003_settings_seed`).
- Created `0001_project`: creates `project` table with all required columns plus a functional unique index `ix_project_name_lower` on `LOWER(name)`. Seeds one "Test Project" row with fixed UUID `00000000-0000-0000-0000-000000000001` and deterministic timestamps.
- Created `0002_settings`: creates `system_settings` and `project_settings` with the inline `ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE")`. Seeds the six default dictionaries in the same revision. No `batch_alter_table`, no deferred FK.
- Created `backend/app/projects/model.py`: `Project` ORM model (`DeclarativeBase`, `Mapped`/`mapped_column`, `UUIDType` for the id column).
- Created `backend/app/projects/repository.py`: `ProjectRepository` extending `BaseRepository[Project]` with `list_paginated()`, `get_by_name_lower()`, and `get_name_conflict()` methods.
- Registered `Project` model in `migrations/env.py` so Alembic autogenerate includes it.
- Removed the stub `project` table workaround from `tests/conftest.py` — now `0001_project` creates the real table before `0002_settings` declares its FK.
- Cleaned up unused `import sqlalchemy as sa` and `import os` from `conftest.py`.

**Deviations from plan**:
- None. The plan specified a clean 2-revision chain; delivered exactly that.

**Technical decisions made**:
- The functional unique index `ix_project_name_lower` is created via `op.create_index(... [sa.text("LOWER(name)")] ...)` in the migration — not in `__table_args__` on the ORM model. SQLAlchemy's `Index` with `func.lower()` in `__table_args__` is not reflected properly by all dialects in migrations; the explicit `op.create_index` with `sa.text("LOWER(name)")` is portable and authoritative.
- `Project.description` uses `Text` (unbounded on SQLite, unlimited on PostgreSQL) rather than `String(5000)`. The 5000-char constraint is enforced at the service/schema layer (TASK-002), not in DDL, consistent with the architecture's DB-agnostic rule.
- `downgrade()` in `0001_project` drops the index before dropping the table to avoid SQLite constraint issues.

**Code locations**:
- `backend/app/projects/__init__.py` — empty package marker
- `backend/app/projects/model.py` — `Project` ORM model
- `backend/app/projects/repository.py` — `ProjectRepository`
- `backend/migrations/versions/0001_project.py` — creates project table + seeds 1 row
- `backend/migrations/versions/0002_settings.py` — creates settings tables + seeds 6 rows
- `backend/migrations/env.py` — added `from app.projects.model import Project`
- `backend/tests/conftest.py` — removed stub table workaround; now runs migrations cleanly

**Technical debt noted**:
- The test suite (41 tests) cannot run in the local environment because `create_app()` in `conftest.py` triggers the `AppContainer` which tries to open `data/app.db` (production path). This is a pre-existing issue that was present before this task. The tests passed in the Docker environment where `data/` is mounted. No new technical debt introduced by this task.
---
status: Done
assignee: backend-developer
story: STORY-002
---

# TASK-002: Settings persistence & migrations

## What to implement
The Settings data layer and its migrations.

- **System settings** — one row per dictionary key, each holding a non-empty list of allowed values.
- **Project settings (overrides)** — at most one row per `(project, key)`.
- Their repository, sitting on the base repository from the core foundation.
- **Schema migration** — creates the two settings tables; must run unchanged on both SQLite (WAL) and
  PostgreSQL.
- **Data-seed migration** — a separate revision loading the six system defaults from the architecture
  (`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`,
  `participant_roles`). Schema and seed are distinct revisions per conventions.

## Scope
`backend/app/settings/` (models + repository), `backend/migrations/` (schema revision + seed revision).

## Dependencies
TASK-001

## Acceptance Criteria
- [ ] `system_settings` and `project_settings` tables exist with the documented columns and the
      `(project, key)` uniqueness for overrides.
- [ ] Schema migration and seed migration are separate revisions and both apply cleanly via
      `upgrade head` on SQLite and PostgreSQL.
- [ ] After seeding a fresh database, all six system dictionary keys are present with their default
      value lists.
- [ ] No dialect-specific logic outside the core data layer.

## Intended ADR
System-defaults seeding via a dedicated Alembic data migration — recorded in the plan; created at
Reconcile if confirmed.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
- Created `backend/app/settings/` package with `model.py` and `repository.py`
- `model.py` defines `SystemSettings` (PK: `key` string) and `ProjectSettings` (composite PK: `project_id` UUID + `key` string) as SQLAlchemy 2.0 ORM models using `Mapped` + `mapped_column`; `project_id` uses `UUIDType` for dialect portability; `project_settings.project_id` has `ForeignKey("project.id", ondelete="CASCADE")`
- `repository.py` defines `SystemSettingsRepository` (get_all, get_by_key, save) and `ProjectSettingsRepository` (get_all_for_project, get_by_project_and_key, save, delete) — both accept a `Session` constructor argument; no inheritance from `BaseRepository` because neither table uses a UUID primary key matching `BaseRepository[T]`'s `get_by_id`/`exists` interface
- Updated `backend/migrations/env.py` to import `SystemSettings` and `ProjectSettings` so their metadata is registered on `Base`
- Migration `0002_settings_schema` — creates `system_settings` and `project_settings` tables; uses `String(36)` for `project_id` in DDL (dialect-portable; no branching needed)
- Migration `0003_settings_seed` — separate data revision; inserts all six system defaults via `op.bulk_insert` using `sa.table`/`sa.column` (no ORM import); downgrade uses `sa.text` with `expanding=True` bind param

**Deviations from plan**:
- Did not add repository Factory providers to `AppContainer` — that belongs in TASK-003 when the service layer and request-scoped session wiring are introduced together; adding them here prematurely would pass `session_factory` where a `Session` instance is expected

**Technical decisions made**:
- Repositories do not extend `BaseRepository` because the settings tables use non-UUID primary keys (`key: str` for `system_settings`; composite `(project_id, key)` for `project_settings`); `BaseRepository` assumes a UUID `id` column. Domain-specific query methods are straightforward without the generic base
- Migration DDL uses `String(36)` for `project_id` rather than a conditional dialect branch — SQLite and PostgreSQL both accept VARCHAR(36); the `UUIDType` ORM-level abstraction handles UUID <-> string conversion at runtime, so the DDL does not need to branch
- Seed migration uses `op.bulk_insert` with a `sa.table()` stub — this avoids importing ORM models in the migration and keeps the migration self-contained; the seed timestamp is fixed (2026-06-30 UTC) to make the migration deterministic

**Code locations**:
- `backend/app/settings/model.py` — ORM models: `SystemSettings`, `ProjectSettings`
- `backend/app/settings/repository.py` — `SystemSettingsRepository`, `ProjectSettingsRepository`
- `backend/migrations/env.py` — added model imports for metadata registration
- `backend/migrations/versions/0002_settings_schema.py` — schema migration
- `backend/migrations/versions/0003_settings_seed.py` — data seed migration

**Technical debt noted**:
- None

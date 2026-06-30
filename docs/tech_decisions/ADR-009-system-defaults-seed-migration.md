# ADR-009: System dictionary defaults seeded via a dedicated Alembic data migration

**Date**: 2026-06-30
**Status**: Accepted
**Decision**: The six system dictionary defaults (`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`) arrive on a fresh database through a **dedicated Alembic data-seed migration** (`0003_settings_seed`), kept as a **separate revision** from the schema migration that creates the `system_settings` / `project_settings` tables (`0002_settings_schema`). The seed migration uses `op.bulk_insert` against a lightweight `sa.table()`/`sa.column()` stub rather than importing ORM models, and uses a fixed seed timestamp so the migration is deterministic. Defaults are therefore present after `alembic upgrade head` with no runtime bootstrap step, on both SQLite and PostgreSQL.
**Options Considered**:
- Dedicated data-seed migration, separate from schema (chosen)
- Seed folded into the schema migration's `upgrade()`
- Runtime bootstrap (seed-if-empty on application startup)
**Rationale**: Keeping schema and seed as distinct revisions follows the backend migration conventions and lets the data seed be reasoned about, re-ordered, or superseded independently of the table DDL. A migration-based seed guarantees defaults exist the moment the database is at head — the "a brand-new project requires no configuration" acceptance criterion holds without any application code running first. Avoiding ORM imports in the migration keeps it self-contained and immune to future model refactors. A runtime seed-if-empty was rejected because it splits "is the database ready" across migrations and app startup, and races under concurrent boot.
**Trade-offs**: Changing a default value later requires a new migration rather than editing a constant — accepted, because seed changes are infrequent and migrations give them an auditable history. The seed values are duplicated between the migration and the architecture document (the canonical list); they must be kept consistent by review.

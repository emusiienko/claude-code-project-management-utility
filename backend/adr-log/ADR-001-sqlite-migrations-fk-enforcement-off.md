# ADR-001: SQLite migrations run with foreign-key enforcement explicitly off

**Date**: 2026-10-06
**Status**: Accepted
**Decision**: The Alembic environment turns SQLite foreign-key enforcement off on every migration
connection, through a connect listener provided by `app/core/database/`. The application engine keeps
enforcement on. PostgreSQL migrations are unaffected.
**Options Considered**:
- Rely on SQLite's default (enforcement off). Rejected: the default depends on how SQLite was compiled,
  so a build with enforcement on by default would cascade during rebuilds.
- Build the migrations engine with `build_engine` (enforcement on) and wrap each rebuild in
  `PRAGMA foreign_keys=OFF`. Rejected: the pragma has no effect inside the transaction Alembic opens,
  and it would put dialect statements in migration scripts.
**Rationale**: SQLite batch rebuilds drop and recreate tables. Dropping a parent table with enforcement
on fires its `ON DELETE` actions and removes or nulls child rows.
**Trade-offs**: Migrations get no FK check while they run. A revision that rebuilds a table or moves
referential data must leave no orphans by itself (Coding Conventions § Alembic).

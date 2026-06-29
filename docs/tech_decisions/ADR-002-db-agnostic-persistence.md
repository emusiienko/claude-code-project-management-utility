# ADR-002: DB-agnostic persistence — configurable SQLite / PostgreSQL

**Date**: 2026-06-29
**Status**: Accepted
**Decision**: Use SQLAlchemy 2.0 + Alembic with a single `DATABASE_URL` switch so the same codebase runs on SQLite (default, zero-config) or PostgreSQL. No dialect-specific code leaks above the data layer.
**Options Considered**:
- SQLite only (simplest, single file)
- PostgreSQL only (robust, but adds an always-on container)
- Both, configurable via SQLAlchemy + `DATABASE_URL` (chosen)
**Rationale**: User requires both options to be possible and configurable. SQLAlchemy abstracts the dialect; Alembic migrates both. SQLite keeps the default install dependency-free on a single machine; PostgreSQL is available when the user wants stronger concurrent-write behavior. PostgreSQL runs as a Docker Compose profile activated only when `DATABASE_URL` targets it.
**Trade-offs**: Portability has a cost: JSON `labels` filtering, UUID storage, case-insensitive uniqueness, and migrations must be written dialect-aware inside the data layer. SQLite needs WAL mode to meet the ≥5 concurrent-request target. We give up Postgres-only features (e.g. native `jsonb` operators in business code) in favor of a portable abstraction.

# ADR-035: SQLite foreign-key enforcement in the application engine; the database is the sole cascade mechanism

**Date**: 2026-10-06
**Status**: Accepted
**Decision**: The application engine enables SQLite foreign-key enforcement on every new connection, alongside WAL, so every declared `ON DELETE CASCADE` / `SET NULL` fires on both dialects. The database is the only mechanism that removes or nulls dependent rows on delete; services perform no row cleanup of their own (link removal on task/story delete, clearing `story.milestone_id` on milestone delete, and every similar cleanup are removed). Migrations on SQLite run with enforcement off (backend ADR-001), so a table rebuild never cascades. Stored attachment files remain the one cleanup outside the database (ADR-034).

This supersedes ADR-018.

**Options Considered**:
- Keep application-level cleanups alongside enforcement as defence in depth. Rejected: two mechanisms for one rule, and the service copy cannot cover a project delete without walking the whole hierarchy.
- Keep enforcement off and extend application-level cleanups to project delete. Rejected: duplicates hierarchy knowledge the schema already declares.

**Rationale**: ADR-018 chose service-level cleanup only because SQLite left the declared actions inert. With enforcement on, the schema is the single statement of what a delete removes, identical on SQLite and PostgreSQL.

**Trade-offs**: A delete's full effect is visible only in the schema, not in service code. Enforcement is per connection on SQLite, so any connection opened outside the application engine (ad-hoc tools, scripts) does not enforce it.

# ADR-018: Application-level link cleanup on parent delete (under the SQLite FK gap)

**Date**: 2026-07-13
**Status**: Accepted

**Decision**: When a task or a story is deleted, all links referencing it (as source **or** target)
are removed **explicitly in the work-item service's delete method**, before the parent row is
deleted — not by relying on the `ON DELETE CASCADE` FK. The tasks service delete calls
`task_link_reader.delete_all_for_task(id)`; the stories service delete calls
`story_link_reader.delete_all_for_story(id)`. Both call through the same runtime-checkable reader
Protocol used for detail composition (a second method on it, `delete_all_for_*`). The
`ON DELETE CASCADE` FKs remain declared on both sides of `task_link` and `story_link` as
defence-in-depth for PostgreSQL and for the eventual PRAGMA fix. This extends the milestone-delete
precedent (which bulk-clears `story.milestone_id` in the service rather than trusting the cascade) to
two more cases.

**Options Considered**:
- **Explicit application-level cleanup in the service delete** (chosen), FK cascade kept as backstop.
- **Rely on `ON DELETE CASCADE` alone**: the FKs are already declared, no extra code.
- **Enable `PRAGMA foreign_keys = ON` on the SQLite connection** so the declared cascade actually
  fires on the default dialect, then rely on it for links.

**Rationale**:
- `ON DELETE CASCADE` is **inert on SQLite as built** — the connection does not enable
  `PRAGMA foreign_keys = ON` (see architecture.md § Known Divergences). Relying on the FK alone would
  leave orphaned link rows on the default SQLite dialect, failing the "no orphaned link records"
  acceptance criterion. Explicit cleanup makes the behaviour identical on both dialects **today**,
  independent of the PRAGMA gap.
- It follows an **already-established precedent** (milestone delete bulk-clears its story links in the
  service), so it is the least-surprising pattern for a future engineer and needs no new mechanism.
- The cleanup reuses the **same injected reader Protocol** already needed for detail composition, so
  no new dependency wiring or import direction is introduced — the work-item service still never
  imports the concrete link package.
- Enabling the PRAGMA is the correct long-term fix but is **out of scope for this story** and is a
  cross-cutting change affecting every declared cascade/SET NULL in the schema (and the test engine).
  It is tracked as a separate follow-up in Known Divergences. Application-level cleanup is safe and
  correct regardless of whether that fix ever lands.

**Trade-offs**:
- The cleanup logic lives in the service, so a delete that bypasses the service (raw SQL, a future
  code path) would orphan link rows on SQLite. Mitigated by routing all deletes through the service
  and by keeping the FK cascade declared as a backstop for PostgreSQL.
- Slight duplication of intent: the FK says "cascade" and the service also does it. Accepted — the FK
  is documentation + PostgreSQL enforcement + future-proofing; the service call is the actual
  guarantee on SQLite. When the PRAGMA fix lands, the service cleanup becomes redundant on both
  dialects but remains harmless and can be left in place or removed deliberately.

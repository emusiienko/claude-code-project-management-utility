# ADR-016: Single-active-milestone invariant enforced by the service in a transaction

**Date**: 2026-07-11
**Status**: Accepted

**Decision**: The invariant "at most one `active` milestone per project" is enforced by the **milestone service inside the activate transaction**, not by a database constraint. Activating a milestone, in one transaction: reads the project's current `active` milestone (if any), demotes it to `planned`, then promotes the target to `active`. The demote-and-promote pair is atomic, so the project can never be observed with two active milestones. Both lifecycle transitions are action endpoints (`POST /milestones/:id/activate`, `POST /milestones/:id/finish`) and are **idempotent**: activating an already-active milestone or finishing an already-finished one is a no-op success. Activation is valid from any prior status, so a `finished` milestone can be re-activated through the same path.

**Options Considered**:
- **Partial unique index** `UNIQUE (project_id) WHERE status = 'active'`: DB-level guarantee of one active per project.
- **Application-enforced atomic demote+promote in the service transaction** (chosen).
- **In-memory / application-level lock** around activation with no transactional guarantee: rejected outright.

**Rationale**:
- A partial/filtered unique index is **not portable** across the two supported dialects the way this codebase requires: PostgreSQL supports partial indexes, but SQLite's support is limited and the constraint semantics differ, violating the DB-agnostic rule (ADR-002). Keeping the invariant in the service keeps one behaviour on both dialects.
- The demote step is intrinsic to activation — activating B *must* deactivate A. A DB constraint would only *reject* a second active milestone; it would not perform the demote. The service has to do the demote anyway, so wrapping demote+promote in one transaction gives atomicity without a second enforcement mechanism to keep in sync.
- A milestone may legitimately move `active → planned` (when superseded) and back to `active` again; the transaction handles this cleanly, whereas a unique constraint adds no value over the transactional swap.
- The transaction is the guarantee. An in-memory guard would be unsafe under concurrent requests (and meaningless if the backend were ever run with multiple workers); it is never treated as sufficient.

**Trade-offs**:
- There is no database-level backstop: a future code path that sets `status = 'active'` **outside** the service's activate method could create two active milestones. Mitigated by routing all status changes through the two action endpoints on the service — status is not settable via the generic `PUT`.
- The read-then-write inside the transaction relies on the transaction's isolation to prevent a concurrent activate on the same project from racing. At this utility's scale (single developer, localhost, WAL SQLite / single Postgres) this is sufficient; it is not designed for high-contention multi-writer activation of the same project.

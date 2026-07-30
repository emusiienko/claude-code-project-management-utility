# ADR-028: An already-applied Alembic migration is never edited in place — add a new corrective migration instead

**Date**: 2026-07-30
**Status**: Accepted

**Decision**: Once a migration revision may have been applied to *any* database — including a single developer's local dev DB — its content is frozen. A schema or seed change to an already-applied revision is delivered as a **new** revision appended to the chain (a forward, idempotent, structurally-detecting corrective migration), never as an in-place edit of the existing revision file. This holds even before a feature branch merges and even when the changed table is believed to exist only on that branch. The only migration content that remains freely editable in place is a revision that has **never** run anywhere (the greenfield-rewrite licence of ADR-010, which this ADR narrows).

The operational tell: Alembic keys `upgrade()`/`downgrade()` execution off the **revision id**, not the file's content. A database whose `alembic_version` already points at revision X will never re-run X's `upgrade()`, no matter how the file is edited afterward. Editing X in place therefore silently diverges: fresh installs get the new shape, already-migrated databases keep the old one, and nothing converges them.

Corrective migrations detect the stale shape **structurally** (inspect the live table for the tell-tale column/index) rather than trusting the revision id, so they converge any database — old-shape or already-correct — and no-op safely on a fresh install.

**Options Considered**:
- Freeze applied revisions; deliver every post-apply change as a new corrective migration (chosen)
- Edit the revision in place when the branch is unmerged, on the assumption the table exists only on that branch (the approach that caused the drift twice)
- Detect the exact migration history and branch corrective logic on the prior revision id (rejected — brittle; structural detection of the current table shape is history-independent)

**Rationale**: The "unmerged branch, so no already-migrated database exists" assumption ignores the developer who ran migrations against their own local dev DB *before* the in-place edit landed — the exact situation that has now bitten this project twice:
- `0002_settings` was edited in place under STORY-008 TASK-005 (adding `operator` to `participant_roles` and the `default_web_ui_role` row). A pre-edit dev DB kept the old seed; `GET /system/settings` 500'd with a `KeyError`. Fixed by `0012_web_ui_role_backfill` (BUG-001; its overlong id later trimmed for PostgreSQL's `VARCHAR(32)` `version_num`, BUG-004).
- `0013_session` was edited in place under STORY-009 TASK-008 (replacing an `is_complete` boolean + nullable free-form `status` with a mandatory 3-value `status` enum). A dev DB that had run the original `0013_session` kept `is_complete` and NULL `status`; `GET /v1/sessions` 500'd with a Pydantic `ValidationError`. Fixed by `0014_session_status_backfill` (STORY-023).

Both incidents produced identical, hard-to-diagnose live drift and both were resolved by the same move — a new structurally-detecting corrective migration. Making that the standing convention removes the per-incident re-litigation and the tempting-but-wrong "it's only on my branch" shortcut.

**Trade-offs**: A pre-merge schema change now costs an extra revision file rather than a quick edit of the one just written, even in the common case where no other environment has actually run it — the safe default is applied uniformly because "has any environment applied this?" is not reliably knowable at edit time. Corrective migrations carry structural-detection boilerplate (inspect columns/indexes, no-op when already-correct) that a clean rewrite would not. Their `downgrade()` is often a deliberate no-op, since a converged table shape cannot distinguish "fixed a stale DB" from "found nothing to fix" — acceptable here because the tested downgrade paths drop the table well past these revisions anyway. This ADR narrows the ADR-010 rewrite licence to its true scope (revisions that have never run anywhere) without superseding it; ADR-010's dependency-ordered, root-first, inline-FK, seed-bundled authoring rules for *new* revisions are unchanged.

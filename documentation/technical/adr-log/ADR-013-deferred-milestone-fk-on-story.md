# ADR-013: `story.milestone_id` ships as an FK-less column until the milestone table exists

**Date**: 2026-07-07
**Status**: Accepted
**Decision**: The `0003_story` migration creates `story.milestone_id` as a plain nullable `String(36)` column **without** a foreign-key constraint. The target `milestone` table does not exist yet — it is created by STORY-012 — so no FK can point at it now. The intended constraint (`story.milestone_id → milestone.id`, `ON DELETE SET NULL`) is added by STORY-012's own migration at the point the `milestone` table is created. The ORM model declares `milestone_id` with `UUIDType` (consistent with every other UUID column) and carries an inline comment referencing this decision and ADR-010; STORY-004's UI never surfaces or sets the column.

**Options Considered**:
- Ship `milestone_id` now as an FK-less nullable column; add the FK in STORY-012's migration (chosen)
- Reorder the migration chain to create `milestone` before `story`
- Add the FK now via a deferred constraint / `batch_alter_table` against a not-yet-existing parent
- Omit the column from `0003_story` entirely and add both column and FK in STORY-012

**Rationale**: The migration chain is dependency-ordered, root-table-first, with every FK declared inline toward an already-existing parent (ADR-010). A story's parent is `project` (created in `0001`), so `0003_story` legitimately declares its `project_id` FK inline; but `milestone` is a sibling entity introduced much later, and an inline FK toward it is impossible without inverting the domain ordering. Reordering to create `milestone` first would force the milestone↔project join and its own dependencies ahead of the core story flow, distorting the delivery order for a column the UI does not yet use. Keeping the column present now (matching the LOCKED contract's `Story.milestone_id` field and the reconciled schema) means STORY-012 adds only a constraint, not a column — avoiding a data backfill — while STORY-004's read/write surface is complete and contract-accurate today.

**Trade-offs**: Between STORY-004 and STORY-012 the database does not enforce referential integrity or `ON DELETE SET NULL` on `milestone_id`; STORY-004's UI never writes the field, and MCP/REST writers are the only path that could set a dangling value, so the exposure window is controlled but real. Adding the FK later on SQLite requires `batch_alter_table` (table rebuild) since SQLite cannot `ALTER TABLE ADD CONSTRAINT` — STORY-012 must handle that portably, a one-time cost carried by that story. A future engineer reading `0003_story` sees one column without the FK its siblings have; the inline model comment and this ADR explain why.

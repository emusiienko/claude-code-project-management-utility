---
status: ToDo
assignee: backend-developer
story: STORY-008
---

# TASK-001: Comment model, migration, and repository

## What to implement
Create the data layer for a new `comments` domain, structurally mirroring the `attachments` domain.

- A polymorphic, FK-less container model: a `container_type` discriminator over story / task /
  milestone plus a `container_id`. The comment carries `content` (Markdown, 1–50,000 chars), a
  required `author_role`, free-form `labels` (key/value pairs), an `ancestors` materialized path,
  and creation/update timestamps. Ids are UUIDs, consistent with every other entity.
- `ancestors` is an ordered (root-first) list of ancestor comment ids, stored as a JSON array;
  empty for a top-level comment. Ancestor ids are held FK-less (no DB-level referential integrity),
  consistent with the polymorphic-container convention.
- A composite index over `(container_type, container_id, created_at)` to back chronological listing.
- The `0011` Alembic migration creating the table, inline-FK-free per the migration convention
  (the container reference and ancestor ids are deliberately FK-less). No seed data.
- A repository providing: container-scoped `list_paginated` (oldest-first) supporting a label-key
  filter, a label-value filter, an ancestors-contains filter (returns the sub-thread beneath a given
  comment), and an `after_id` watermark applied as a keyset predicate on `(created_at, id)`; single
  fetch / insert / update / delete; a `list_by_ids` ordered-fetch helper; and a cascade pair
  (`list_all_for_container` + `delete_all_for_container`).
- Reuse the shared dialect-aware JSON-array filter helper for label and ancestors-contains filters,
  and keep string→UUID coercion in the shared base repository.

## Scope
New `comments` domain: model, migration, repository. No service/controller/MCP in this task.

## Dependencies
None.

## Acceptance Criteria
- [ ] The comment table exists via the `0011` migration and applies cleanly on both SQLite and
  PostgreSQL as part of a full clean-install migration run.
- [ ] The model stores `container_type`, `container_id`, `content`, `author_role`, `labels`,
  `ancestors`, and timestamps, with the chronological composite index present.
- [ ] `list_paginated` returns oldest-first and honors label-key, label-value, ancestors-contains,
  and `after_id` filters, alone and in combination.
- [ ] `list_by_ids` returns the requested comments and preserves a caller-supplied order.
- [ ] The cascade pair enumerates and removes all comments for a container.
- [ ] Label and ancestors-contains filtering behave identically on SQLite and PostgreSQL.

## Intended ADR
None directly (the persisted `ancestors` decision is recorded as a Planned ADR in the
implementation plan; the ADR file is created at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

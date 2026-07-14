---
status: ToDo
assignee: backend-developer
story: STORY-007
---

# TASK-001: Attachment data layer, migrations, and filesystem delete

## What to implement

Establish the persistence layer for the attachments domain — one table and its data-access layer —
plus a filesystem delete capability.

**attachment table:**
- A single table carrying a `container_type` discriminator (`story` | `task` | `milestone`) and a
  `container_id`. `container_id` is a **polymorphic** reference across three tables and therefore
  carries **no foreign key** — container existence is enforced in the service layer, not the DB.
- Fields per the ratified contract and backend requirements: `type`, `kind`
  (`document` | `image` | `file` | `external-ref`), `mime_type` and `file_size_bytes` (required for
  document/image/file), a server-internal file path that is never serialized, conditional
  `external_url`, free-form `external_status`, `author_role` (optional, free-form — who created the
  attachment; descriptive metadata, set at create, nullable), and create/update timestamps. There is
  no `archived_at` column — attachments are not archived.
- Index on `(container_type, container_id, type)`.

**Data access:**
- Repository operations for: per-container filtered/paginated listing (filter by `type`, `kind`),
  single fetch, insert, and hard delete. Attachments are immutable and never archived, so there is no
  update or archive operation.
- A query set supporting application-level cascade removal: given a container, enumerate and remove all
  its attachments (used by TASK-003). Provide what is needed to also remove the associated files.

**Migrations:**
- Author the migration in the established root-first, inline-FK style (append to the chain; the
  attachment table's `container_id` is a plain column with no FK). UUID columns declared portably as
  `String(36)` in DDL. No seed data for this table.

**Filesystem storage:**
- Extend the filesystem storage helper with a delete capability so files can be permanently removed.
  Deletion must tolerate an already-absent file without error.

## Scope
`backend/app/attachments/` (model + repository), `backend/migrations/`, `backend/app/core/storage/`.

## Dependencies
None.

## Acceptance Criteria
- [ ] The attachment table is created by a migration that runs cleanly on both SQLite and PostgreSQL, upgrade and downgrade.
- [ ] `container_id` has no foreign key.
- [ ] The required index exists.
- [ ] The repository supports per-container filtered/paginated listing, single fetch, insert, hard delete, and the cascade-removal query set (no archive, no update).
- [ ] The filesystem storage helper can delete a file, and is a no-op when the file is already absent.

## Intended ADR
None created here. One decision is recorded at Reconcile (see implementation_plan.md "Planned ADRs"): the polymorphic FK-less container with application-level cascade.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
</content>

# ADR-021: Attachments are immutable — no version history, no archive

**Date**: 2026-07-15
**Status**: Accepted

**Decision**: An attachment has exactly **one** stored file (for document/image/file kinds), written
once at create and never overwritten. The attachment lifecycle is **create + delete only**:

- There is **no update** — no `PUT /attachments/:id`, no service update method, for any kind. To change
  a document's content or an external-ref's `external_status`, delete the attachment and create a new
  one.
- There is **no version history** — the `AttachmentVersion` entity, the `GET /attachments/:id/history`
  endpoint, and the `GET /attachment-versions/:id/file` endpoint (all present in the earlier design)
  are removed. No snapshot files are written.
- There is **no archive** — no `POST /attachments/:id/archive`, no `archived_at` column, no
  `include_archived` list filter. `DELETE /attachments/:id` is permanent and works for **every** kind
  (it removes the DB row and, for document/image/file, the stored file).

This partially supersedes ADR-005: ADR-005's core decision (store attachment content on the filesystem,
not the database) still stands; only its versioning clause ("each document content update writes a new
snapshot file and an `AttachmentVersion` row") is retired here.

**Options Considered**:
- **Immutable single-file attachments, create + delete only** (chosen).
- **Mutable attachments with version history** (the earlier design): update-in-place writing a new
  snapshot file + an `AttachmentVersion` row per change, with a history endpoint.
- **Immutable content but keep an archive step** (soft-delete / `archived_at`) instead of a hard delete.

**Rationale**:
- The utility **stores facts and does not enforce process** (a first-principles constraint of this
  project). Version history is process/audit machinery — it implies a lifecycle the tool deliberately
  does not model. Dropping it keeps the attachment the simplest thing that satisfies the requirement:
  a named artifact with content.
- "Change = delete + create" is honest about what an in-place update actually is for a
  content-addressed file, and it collapses the update path entirely — one create path (four kinds, JSON
  or multipart or MCP base64) and one delete path, no update path to design, validate, or test across
  two access surfaces.
- **Archive was removed because it would re-introduce version history through the back door.** If
  superseded attachments were archived rather than deleted, the accumulated archived rows would *be* a
  version history — exactly what removing `AttachmentVersion` set out to eliminate. Hard delete for
  every kind keeps the model consistent with the no-history decision.
- Immutability makes the polymorphic FK-less cascade (ADR-020) and the filesystem/DB consistency story
  (ADR-005) simpler: files are write-once, so there is no update-time reconciliation between disk and
  row — only create and delete touch both stores.

**Trade-offs**:
- No built-in audit trail or rollback for attachment content. A user who wants history must keep the
  old attachment (create the new one alongside it) rather than relying on the system to retain it.
  Accepted — this is a personal, single-developer tool, and git already versions the source artifacts
  these attachments usually mirror.
- Editing a document attachment costs a delete + re-create round trip (new id, new file) rather than an
  in-place text edit. Accepted as the deliberate cost of the simpler model.
- Delete is irreversible for every kind (no archive safety net). Accepted for the same
  stores-facts-not-process reason; the container-cascade delete already deletes attachments outright.

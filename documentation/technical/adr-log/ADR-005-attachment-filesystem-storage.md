# ADR-005: Attachment content stored on the filesystem

**Date**: 2026-06-29
**Status**: Accepted (attachment versioning superseded by ADR-021 — the filesystem-storage decision stands; the `AttachmentVersion`/snapshot clause is retired)
**Decision**: Store document and image attachment content as files in a server-managed directory (Docker volume), not as blobs/text in the database. The database holds metadata plus a server-internal `file_path` that is never exposed in API responses. Each document content update writes a new snapshot file and an `AttachmentVersion` row.
**Options Considered**:
- Store content in the database (BLOB / TEXT columns)
- Store content on the server filesystem (chosen)
**Rationale**: Required by the backend requirements — attached artifacts (plans, architecture docs, implementation reports) should be directly accessible as files on disk. Filesystem storage keeps the database small and serves files with the correct `Content-Type`. Versions are immutable snapshot files, giving cheap document history.
**Trade-offs**: File and DB state must be kept consistent (a file write plus a row write). Backups must include both the database and the attachments volume. Files are served without auth — acceptable because the whole stack is localhost-only.

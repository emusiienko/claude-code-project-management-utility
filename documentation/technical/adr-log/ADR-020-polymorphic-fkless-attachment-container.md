# ADR-020: Polymorphic FK-less attachment container with application-level cascade

**Date**: 2026-07-15
**Status**: Superseded by ADR-034

**Decision**: The `attachment` table holds a single polymorphic association to its owning work item
via a `container_type` discriminator (`story` | `task` | `milestone`) plus a `container_id`. Because
`container_id` can reference three different tables, it carries **no database foreign key**. Two
consequences follow and are both handled in the application layer, never the database:

1. **Container existence is validated in the attachments service** — before an attachment is created,
   the parent story/task/milestone is resolved through one of three reader Protocols
   (`StoryReaderProtocol`, `TaskReaderProtocol`, `MilestoneReaderProtocol`, declared in the attachments
   service module and satisfied structurally by the respective repositories). A missing container is a
   404. The owning project (for `attachment_types` dictionary validation) is resolved from the
   container — directly for story/milestone, transitively (`task → story → project`) for task.
2. **Cascade removal on container delete is application-level.** Deleting a story, task, or milestone
   removes that container's attachment rows **and** their files on disk, driven by the work-item
   service's `delete` through an injected `AttachmentReaderProtocol` (`list_all_for_container` /
   `delete_all_for_container`), before the container row is removed. Files are removed first (the
   `file_path` lives only on the row), then the rows are bulk-deleted.

**Options Considered**:
- **Single polymorphic FK-less table with app-level existence + cascade** (chosen).
- **Three separate attachment tables** (`story_attachment`, `task_attachment`, `milestone_attachment`),
  each with a real FK and DB-enforced cascade.
- **One table with three nullable FK columns** (`story_id`, `task_id`, `milestone_id`) and a CHECK that
  exactly one is set.

**Rationale**:
- The attachment payload is identical across all three containers (type/kind/mime/file/external-ref/
  author_role). Three tables would triple the model, repository, migration, and MCP/REST surface for no
  behavioural difference, and the frontend already treats "attachments of a container" as one reusable
  behavior mounted in three hosts.
- Three nullable FK columns plus a CHECK constraint keeps DB-enforced referential integrity but bloats
  every row and query with two always-null columns and needs dialect-portable partial-constraint DDL —
  more complexity than the single discriminator column, again for no functional gain here.
- The application-cascade half is **not a new pattern**: it extends the ADR-018 precedent (link cleanup
  done in the service because `ON DELETE CASCADE` is inert on SQLite as built) to a case where there is
  no FK to lean on in the first place. The SQLite `PRAGMA foreign_keys` gap is therefore irrelevant to
  attachments — cascade is application-level by design, not as a workaround, so it behaves identically
  on SQLite and PostgreSQL today.
- Existence validation through reader Protocols reuses the one-way cross-domain read pattern already
  used by stories→milestones, tasks→task_links, and stories→story_links: the attachments service reads
  the three work-item repositories, and the three work-item services receive the attachments service
  back as a Protocol — no concrete cross-imports, no circular dependency. The DI container declares the
  attachment service before the work-item services so the reader can be injected.

**Trade-offs**:
- No database-level guarantee that `container_id` points at a live row: a container could be deleted by
  a code path that bypasses the service and orphan its attachments (rows + files). Mitigated by routing
  every delete through the service and by the fact that this utility has a single writer surface.
- Referential integrity for attachments is only as strong as the service. Accepted deliberately: the
  polymorphic shape cannot express a single FK, and the alternative that keeps DB enforcement (three
  tables) costs more than the guarantee is worth for a localhost single-developer tool.
- File/row consistency spans two stores (filesystem + DB) on both create and cascade delete; a crash
  between the two can leave a stray file or a stray row. Same class of exposure ADR-005 already accepts
  for filesystem-backed content.

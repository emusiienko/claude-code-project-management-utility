# ADR-034: Real container foreign keys for attachments and comments, with an orphan file sweep

**Date**: 2026-10-05
**Status**: Accepted
**Decision**: Attachments and comments reference their container through three nullable foreign keys, `story_id`, `task_id` and `milestone_id`, each `ON DELETE CASCADE`, in place of the polymorphic `container_type` / `container_id` pair.
- A CHECK on each table requires exactly one of the three to be set. It is written as the three explicit `IS NOT NULL` / `IS NULL` combinations, so it runs unchanged on SQLite and PostgreSQL.
- The database removes attachment and comment rows on every container delete, transitively (project → stories → tasks, project → milestones). The application does no attachment or comment cascade.
- Stored attachment files are removed by an orphan sweep owned by the storage layer: it deletes every stored file that no attachment row points to. It runs after an attachment, task, story, milestone or project delete commits, and once at startup before requests are served.
- A single-attachment delete removes its row, commits, then deletes its file directly. The sweep is the safety net for cascades, rollbacks and crashes.
- A file is always removed after the commit, never before, so a rolled-back delete loses no bytes. A sweep failure never fails the delete; the next sweep catches up.
- The sweep never removes a file whose creating request may still be in flight (a file younger than a grace window longer than any create request). The startup sweep has no such window to respect.
- The wire shape does not change: `container_type` / `container_id` stay in the API, derived from whichever key is set.
- The original attachment and comment migrations are edited in place to create this shape; there is no separate upgrade revision. Existing databases are wiped, since none holds real data yet.

This supersedes ADR-020. It relies on SQLite FK enforcement in the application engine, delivered in the same story.

**Options Considered**:
- A helper service that walks the container hierarchy on every delete. Rejected: it keeps hierarchy knowledge in the application, which the database already holds once FKs are enforced.
- Collecting file paths before a cascading delete. Rejected for the same reason.
- A "deleted" status on attachments, marked on delete and swept later. Rejected: cascaded rows are removed inside the database and can't be marked, it adds an update to immutable attachments (ADR-021), and every read would have to filter marked rows.
- Three separate attachment and comment tables. Rejected for the reason ADR-020 gives.

**Rationale**: ADR-020 rejected nullable FKs because SQLite did not enforce FKs and a portable exactly-one check seemed awkward. Enforcement now exists, and the explicit-combination CHECK is portable. The physical model now matches the Logical Data Model, which already defines these three keys.

**Trade-offs**: Two of the three key columns are always null on each row. Every delete that can cascade to an attachment triggers a full scan of the attachments store against the referenced paths, which is acceptable at this utility's scale. Between a commit and the next sweep, orphaned files may sit on disk. A database created before this change cannot be upgraded and must be recreated.

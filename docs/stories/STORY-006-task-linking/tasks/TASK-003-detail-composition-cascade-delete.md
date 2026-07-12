---
status: ToDo
assignee: backend-developer
story: STORY-006
---

# TASK-003: Detail composition + cascade delete wiring

## What to implement

Three pieces of cross-domain wiring plus the migration that persists both link tables.

**Detail composition — links on the detail responses.** The tasks service and the stories service must each populate a `links` collection on their detail response with all links for the item (both directions), enriched with the linked item's `id`, `title`, and `status`.

- `GET /tasks/:id/detail` currently returns an empty `links` array — populate it from the task-link data.
- `GET /stories/:id/detail` currently has no `links` field — add a `links` field to the story-detail response and populate it.

This follows the existing "work-item service reads another domain's data through an injected Protocol" pattern (the way the stories service already asks the tasks data layer for its task aggregate). The tasks service gains an injected, runtime-checkable reader Protocol duck-typed to the task-link service's "list enriched links for a task (both directions)" method; the stories service gains the equivalent story-link reader Protocol. The work-item services import only the Protocols — never the concrete link packages — so composition stays one-way (work-item service → link data) with no circular import.

**Cascade delete — application-level cleanup.** `ON DELETE CASCADE` is inert on SQLite as built (the PRAGMA gap in architecture.md § Known Divergences), so the parent delete must clear link rows explicitly, mirroring the milestone-delete precedent. Extend the same injected reader Protocol with a "delete all links referencing this item id" method (either side). The tasks service delete must remove all task links referencing the task; the stories service delete must remove all story links referencing the story — before or as part of the delete — so no orphaned link records remain on **either** dialect.

**Migration.** Append a single new Alembic revision that creates both link tables (`task_links`, `story_links`). Each table has a source id, a target id, and a `link_type`, with inline FKs declared toward the already-existing parent tables (`task.id`, `story.id`) as `ON DELETE CASCADE` per ADR-010 (kept as defence-in-depth for PostgreSQL and the future PRAGMA fix). Add a uniqueness constraint/index on (source id, target id, `link_type`) per table to back the duplicate-rejection rule, and the direction lookup indexes needed by the enrichment reads (source id, target id).

**Container wiring.** The link service providers (declared in TASK-001/TASK-002) must be passed into the tasks/stories service providers as their link readers, following the ordering already used where `task_repository` is declared before and passed into the stories service.

## Scope

`backend/app/tasks/` service + detail schema; `backend/app/stories/` service + detail schema; the two link reader Protocols; DI container wiring; new Alembic migration revision.

## Dependencies

TASK-001, TASK-002.

## Acceptance Criteria

- [ ] `GET /tasks/:id/detail` returns `links` populated with all task links (outbound + inbound), each enriched with the linked task's `id`, `title`, and `status`.
- [ ] `GET /stories/:id/detail` returns a `links` array populated with all story links (outbound + inbound), each enriched with the linked story's `id`, `title`, and `status`.
- [ ] Deleting a task removes all task links referencing it (either side) with no orphaned rows on both SQLite and PostgreSQL.
- [ ] Deleting a story removes all story links referencing it (either side) with no orphaned rows on both dialects.
- [ ] The work-item services depend on link data only through injected runtime-checkable Protocols; no concrete link package is imported by the tasks/stories services and there is no circular import.
- [ ] A single new migration creates both link tables with inline `ON DELETE CASCADE` FKs, the (source, target, type) uniqueness index per table, and the direction lookup indexes; it applies cleanly on both dialects.

## Intended ADR

Record at Reconcile that link cleanup is done application-side (not relying on the FK cascade) under the SQLite PRAGMA gap, extending the milestone-delete precedent — see implementation_plan.md § Planned ADRs.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

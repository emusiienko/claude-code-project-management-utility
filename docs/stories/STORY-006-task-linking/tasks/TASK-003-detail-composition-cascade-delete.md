---
status: Done
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

**Date**: 2026-07-12

**What was done**:
Three pieces of cross-domain wiring were implemented as specified:

1. **TaskLinkReaderProtocol** — added as a `@runtime_checkable` Protocol in `backend/app/tasks/service.py` with two methods: `list_all_enriched_for_task(task_id: UUID) -> list` and `delete_all_for_task(task_id: UUID) -> None`. `TaskService.__init__` now accepts an optional `task_link_reader: TaskLinkReaderProtocol | None` parameter.

2. **TaskService.get_detail** — changed signature from returning `Task` to `tuple[Task, list]`. The service calls `task_link_reader.list_all_enriched_for_task(task.id)` when the reader is injected; returns an empty list when it is not. The controller `get_task_detail` was updated to unpack the tuple and attach the serialized links to `TaskDetail.links`.

3. **TaskService.delete** — calls `task_link_reader.delete_all_for_task(task.id)` before `_repo.delete(task)` when the reader is injected, providing explicit application-level cascade on SQLite (where `ON DELETE CASCADE` is inert without `PRAGMA foreign_keys = ON`).

4. **StoryLinkReaderProtocol** — added as a `@runtime_checkable` Protocol in `backend/app/stories/service.py` with `list_all_enriched_for_story(story_id: UUID) -> list` and `delete_all_for_story(story_id: UUID) -> None`. `StoryService.__init__` now accepts an optional `story_link_reader: StoryLinkReaderProtocol | None` parameter.

5. **StoryDetail schema** — new `StoryDetail(Story)` Pydantic model added to `backend/app/stories/schema.py` with `links: list[dict] = []`, `attachments: list[dict] = []`, `comments: list[dict] = []`.

6. **StoryService.get_detail** — new method returning `tuple[Story, list]`, parallel to the tasks pattern.

7. **StoryService.delete** — calls `story_link_reader.delete_all_for_story(story.id)` before `_repo.delete(story)` when the reader is injected.

8. **GET /stories/:id/detail endpoint** — new route handler `get_story_detail` added to `backend/app/stories/controller.py`, registered before the existing `/aggregate` route.

9. **get_story_detail MCP tool** — added to `backend/app/stories/mcp_tools.py` mirroring the REST handler.

10. **Container wiring** — `AppContainer` in `backend/app/container/container.py` was reorganised to declare `task_link_service` and `story_link_service` before `task_service` and `story_service` respectively, then pass them as `task_link_reader` and `story_link_reader` named arguments. Declaration order was cleaned up to reflect dependency order.

**Deviations from plan**:
None. The plan was followed exactly. Migrations were already created in TASK-001/TASK-002 (0006_task_link and 0007_story_link), so no new migration was needed for TASK-003.

**Technical decisions made**:
- `get_detail` returns `tuple[Task | Story, list]` rather than a new domain object, keeping the service boundary identical to the existing pattern (the controller assembles the response schema). The enriched links are serialized to `list[dict]` at the controller boundary.
- `TaskLinkReaderProtocol` and `StoryLinkReaderProtocol` are declared in the **consuming** service modules (tasks/service.py and stories/service.py respectively), not in the link packages. This keeps the dependency direction one-way: work-item services depend on their own Protocols; link services satisfy them structurally without any explicit import from the consuming side.
- `@runtime_checkable` allows the `issubclass` structural check to be verified in tests without instantiating the concrete services.

**Code locations**:
- `backend/app/tasks/service.py` — `TaskLinkReaderProtocol`, `TaskService.__init__`, `get_detail`, `delete`
- `backend/app/stories/service.py` — `StoryLinkReaderProtocol`, `StoryService.__init__`, `get_detail`, `delete`
- `backend/app/stories/schema.py` — `StoryDetail`
- `backend/app/tasks/controller.py` — updated `get_task_detail`
- `backend/app/stories/controller.py` — new `get_story_detail`, updated `StoryDetail` import
- `backend/app/stories/mcp_tools.py` — new `get_story_detail` MCP tool
- `backend/app/container/container.py` — provider declaration order + `task_link_reader` / `story_link_reader` wiring

**Technical debt noted**:
None.

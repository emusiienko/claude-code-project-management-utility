---
status: Done
assignee: backend-developer
story: STORY-008
---

# TASK-004: Detail composition and cascade delete

> **Superseded in part by TASK-012 (2026-07-20).** Detail views composed comments oldest-first here;
> the ordering Revision in `implementation_plan.md` reversed that to newest-first (via the repository
> enumerate-all path). This task's report below is left unchanged; the current ordering is TASK-012's.
> The cascade-delete behavior is unaffected.

## What to implement
Wire comments into the story, task, and milestone detail views and delete cascades, using the
`CommentReader` Protocol from TASK-002 — mirroring how `AttachmentReader` is already injected into
those three services.

- Inject a `CommentReader` dependency into the story, task, and milestone services (alongside the
  existing attachment reader), imported Protocol-only.
- Each `get_detail` populates its `comments` list with the container's comments ordered oldest-first
  — closing the previously-empty `comments` field on all three detail views.
- Each `delete` cascades comment removal for its container (the reader's cascade path), consistent
  with the existing attachment cascade on delete.

## Scope
Story, task, and milestone services (detail composition + delete cascade). No new endpoints; the
existing detail and delete endpoints gain populated/cascaded comments.

## Dependencies
TASK-002.

## Acceptance Criteria
- [x] Story, task, and milestone detail responses return their comments oldest-first (empty list
  when none), replacing the previously-always-empty `comments` field.
- [x] Deleting a story, task, or milestone removes all its comments — no orphaned comment rows
  remain.
- [x] The three services depend only on the `CommentReader` Protocol, not on the comment controller
  or concrete service type beyond the Protocol.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20
**What was done**: Wired the `CommentReaderProtocol` (already declared in `app.comments.service`
by TASK-002, with `comment_repository`/`comment_service` already registered on the DI container by
TASK-003) into `StoryService`, `TaskService`, and `MilestoneService`, mirroring the existing
`AttachmentReaderProtocol` injection exactly:
- Each service's `__init__` gained an optional `comment_reader: CommentReaderProtocol | None = None`
  constructor parameter, imported Protocol-only (`from app.comments.service import
  CommentReaderProtocol`) alongside the container-type constant re-exported by the comments package
  (`from app.comments.schema import CONTAINER_STORY as COMMENT_CONTAINER_STORY`, etc.) — the comments
  package defines its own container-type constants independent of `app.attachments.schema`, so both
  are imported side by side under distinct aliases.
- `get_detail` on all three services now also calls `comment_reader.list_all_for_container(...)` and
  returns the result as an additional list element, oldest-first (the repository's existing ordering,
  unchanged by this task): `StoryService.get_detail`/`TaskService.get_detail` return
  `tuple[Model, list, list, list]` (was 3-tuple, now 4: entity, links, attachments, comments);
  `MilestoneService.get_detail` returns `tuple[Milestone, list, list]` (was 2-tuple, now 3:
  milestone, attachments, comments) — milestones have no links concept.
- `delete` on all three services now also calls `comment_reader.delete_all_for_container(...)`
  immediately after the existing attachment cascade call, before the entity row is deleted —
  same application-level cascade pattern used for attachments and links (ADR-018 precedent),
  necessary because the polymorphic comment container has no DB-enforced FK (SQLite `ON DELETE
  CASCADE` is inert without `PRAGMA foreign_keys = ON`).
- Updated all six call sites that unpack the `get_detail` tuple and populate the response
  (`stories/controller.py`, `stories/mcp_tools.py`, `tasks/controller.py`, `tasks/mcp_tools.py`,
  `milestones/controller.py`, `milestones/mcp_tools.py`) to unpack the new tuple shape and set
  `detail.comments = [c.model_dump(mode="json") for c in comments]`, matching the existing
  `attachments` serialization pattern (comments are returned as `Comment` Pydantic schema objects
  from `CommentReaderProtocol.list_all_for_container`, same as attachments).
- Wired `comment_reader=comment_service` into the `milestone_service`, `story_service`, and
  `task_service` providers in `app/container/container.py` (all three already receive
  `attachment_reader=attachment_service`; `comment_service` was already declared earlier in the file
  by TASK-003, in the same provider-declaration slot as `attachment_service`, specifically to make
  this wiring possible without reordering).
- Removed the now-stale "comments stays empty pending STORY-008" comment on `MilestoneDetail` in
  `milestones/schema.py`, and the matching stale note in `container.py` above the comments domain
  provider block.
**Deviations from plan**: None. `CommentReaderProtocol` was already fully specified by TASK-002
exactly as this task's "What to implement" describes it, so no new Protocol design was needed here.
**Technical decisions made**: Kept the comments package's own `CONTAINER_STORY`/`CONTAINER_TASK`/
`CONTAINER_MILESTONE` constants (from `app.comments.schema`) distinct from the attachments package's
identically-named-and-valued constants (from `app.attachments.schema`), importing both under aliases
in each service rather than reusing the attachments constant for the comment_reader call — this
preserves the comments package's declared intent to stay independent of the attachments domain (see
`app/comments/schema.py` module docstring) even though the string values happen to coincide today.
**Code locations**: `backend/app/stories/service.py`, `backend/app/tasks/service.py`,
`backend/app/milestones/service.py`, `backend/app/stories/controller.py`,
`backend/app/stories/mcp_tools.py`, `backend/app/tasks/controller.py`,
`backend/app/tasks/mcp_tools.py`, `backend/app/milestones/controller.py`,
`backend/app/milestones/mcp_tools.py`, `backend/app/milestones/schema.py`,
`backend/app/container/container.py`.
**Technical debt noted**: `backend/tests/test_attachments.py::test_milestone_detail_includes_
attachments_and_empty_comments` (line ~1344) still asserts `data["comments"] == []` with the message
"Milestone detail comments should stay empty pending STORY-008" — the assertion still passes
functionally (that test's milestone has no comments created for it), but the message and test name
are now stale since comments are populated as of this task. Left untouched since `backend/tests/` is
owned by qa-automation per `docs/qa-automation-strategy.md`; flagging for TASK-011 (which already
scopes "detail composition" for comments) to update the test name/message and add coverage for the
non-empty case across all three containers plus the cascade-delete-removes-comments behavior.
Verified both manually via a temporary, since-removed integration test exercising all three REST
detail + delete endpoints end-to-end before handing off.

---
status: Done
assignee: backend-developer
story: STORY-009
---

# TASK-004: Reference-integrity cascade on story/task delete

## What to implement
Make a session's link to a story/task become null automatically when that story or task is deleted — on
both the default SQLite database (where the `SET NULL` FK is inert) and PostgreSQL.

Inject the session reference-cleaner (the Protocol declared by the sessions service in TASK-002) into the
**stories** service and the **tasks** service via the DI container. In each service's existing delete
path, invoke the cleaner to null every session reference to the entity being deleted, alongside the
attachment/comment/link cleanup those deletes already perform. Deleting a story nulls `linked_story_id`
on every session that referenced it; deleting a task nulls `linked_task_id` likewise. The session record
itself is never deleted by this path — only the reference is cleared.

Keep imports one-directional: the stories/tasks services import only the cleaner Protocol from the
sessions service; the sessions service imports nothing from them. Wire concrete instances through
`AppContainer`, mirroring how the attachment/comment readers are injected into these same services.

Do **not** add any project→session app-level cleanup — project deletion removing its sessions relies on
the `project_id` FK cascade, exactly like every other project child (covered by the standing
`PRAGMA foreign_keys` fix).

## Scope
`backend/app/stories/` (service delete cascade), `backend/app/tasks/` (service delete cascade),
`backend/app/container/` (inject the cleaner).

## Dependencies
TASK-003

## Acceptance Criteria
- [ ] Deleting a story that a session links to leaves the session intact with `linked_story_id` set to
      null — verified on SQLite (default) and PostgreSQL.
- [ ] Deleting a task that a session links to leaves the session intact with `linked_task_id` set to
      null — verified on both dialects.
- [ ] The cleaner is injected via `AppContainer`; imports between sessions and stories/tasks remain
      one-directional (no import cycle).
- [ ] No bespoke project→session cleanup is added.

## Intended ADR
See the plan's Planned ADRs — this applies ADR-018 (application-level reference cleanup under the inert
SQLite FK). No new ADR expected unless the reverse-reference direction is judged distinct at Reconcile.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-29
**What was done**: Injected `SessionReferenceCleanerProtocol` (already declared on `SessionService` in
TASK-002, backed by `SessionRepository.clear_linked_story`/`clear_linked_task` from TASK-001) into both
`StoryService` and `TaskService` as an optional constructor dependency, `session_reference_cleaner`.
Each service's existing `delete()` cascade now calls the cleaner (`clear_references_to_story` /
`clear_references_to_task`) right after the attachment/comment cleanup and before the row delete itself
— nulling every session's `linked_story_id`/`linked_task_id` that pointed at the entity being removed,
without deleting the session record. Wired the concrete `session_service` instance into both
`story_service` and `task_service` providers in `AppContainer` (declared after `session_service`, which
was already positioned before them from TASK-003). Verified end-to-end on SQLite (the dialect where the
`SET NULL` FK is inert) with a temporary scratch integration test (create project → story/task → session
linked to it → delete the story/task → GET the session → linked id is `null`, session still exists);
removed the scratch file afterward since test authorship belongs to qa-automation (TASK-007).
**Deviations from plan**: None.
**Technical decisions made**: Kept the dependency optional (`| None = None`) and guarded with an
`is not None` check, mirroring the existing `attachment_reader`/`comment_reader`/`*_link_reader`
pattern in both services — consistent DI style, and it keeps each service unit-constructible without
every cross-domain collaborator. Placed the cascade call after attachment/comment cleanup and before
`self._repo.delete(...)`, matching the plan's "alongside the attachment/comment/link cleanup" instruction
and the existing ordering convention. No new import cycle: `stories/service.py` and `tasks/service.py`
import only `SessionReferenceCleanerProtocol` from `app.sessions.service`; `app.sessions.service` imports
`Story`/`Task` only under `TYPE_CHECKING`, so there is no runtime circular import.
**Code locations**: `backend/app/stories/service.py` (constructor + `delete()`), `backend/app/tasks/service.py`
(constructor + `delete()`), `backend/app/container/container.py` (`story_service`/`task_service`
providers gain `session_reference_cleaner=session_service`).
**Technical debt noted**: None. No bespoke project→session cleanup was added, per the task's explicit
instruction — project deletion cascading to its sessions continues to rely solely on the `project_id`
FK (enforced on PostgreSQL, covered on SQLite only by the standing, not-yet-applied
`PRAGMA foreign_keys = ON` fix tracked elsewhere).

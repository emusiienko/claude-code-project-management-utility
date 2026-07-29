---
status: ToDo
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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

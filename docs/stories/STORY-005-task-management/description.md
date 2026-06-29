---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-005: Task Management

## Desired Outcome
Atomic work items can be created and managed within stories. Each task has a type and status drawn from the project's configured dictionaries, optional assignee and creator roles, and Markdown content. A single call returns the complete task context — fields, links, attachments, and comments — so agents can load everything they need in one request. Within a story, tasks are presented in a Kanban board grouped by status, with drag-and-drop status transitions for the human orchestrator.

## Context
Tasks are the core operational unit that agents write to and read from. The detail endpoint exists to minimise round trips: an agent starting a session calls it once per task and gets the full picture. The Kanban board is the primary visual surface for the human orchestrator reviewing work in progress. Dictionary-validated fields (type, status, roles) are validated against the project's effective settings at every write.

## Acceptance Criteria
- [ ] A task can be created within a story with a required title (1–500 chars), required type (from project's `task_types`), required status (from project's `task_statuses`), optional Markdown content, optional `assignee_role` and `creator_role` (both from project's `participant_roles`), and optional free-form labels
- [ ] Tasks within a story can be listed with pagination and filtered by type, status, `assignee_role`, and `creator_role`
- [ ] A task's title, content, type, status, roles, and labels can be updated individually; all dictionary-validated fields are re-validated on each update
- [ ] A task can be deleted; all its links, attachments, and comments are permanently removed
- [ ] A single detail call returns the task's own fields plus all its outbound and inbound links (each with linked task id, title, status), all active attachments, and all comments in chronological order
- [ ] Within a story view, tasks are grouped into Kanban columns by status, ordered as defined in the project's effective `task_statuses`; moving a task to a different column updates its status
- [ ] A single task can be retrieved by its ID

## Edge Cases & Error Scenarios
- [ ] Setting a task's type or status to a value not in the respective project dictionary is rejected with a validation error listing the allowed values
- [ ] A task with no links, attachments, or comments returns empty arrays for those fields in the detail response — not an error
- [ ] Deleting a task removes all its links (both outbound and inbound), attachments, and comments atomically
- [ ] Moving a task on the Kanban board to a status column that was removed from the dictionary after the board loaded returns an error and leaves the task unchanged

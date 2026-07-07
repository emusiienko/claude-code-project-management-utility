---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-005: Task Management

## Desired Outcome
Atomic work items can be created, listed, updated, and deleted within stories. Each task has a type and status drawn from the project's configured dictionaries, optional assignee and creator roles, optional Markdown content, and free-form labels. A single call returns a task's own fields. Within a story, tasks are presented in a Kanban board grouped by status, with drag-and-drop status transitions for the human orchestrator. An on-demand task-completion count ("N of M tasks done") reflects the current state of tasks without storing derived data.

## Context
Tasks are the core operational unit. Dictionary-validated fields (type, status, roles) are validated against the project's effective settings at every write. The Kanban board is the primary visual surface for the human orchestrator reviewing work in progress. The task aggregate ("3 of 5 done") is computed on demand so it is always accurate without any background synchronisation.

This story covers only the Task entity itself. Linking tasks to one another (STORY-006), adding attachments (STORY-007), and adding comments (STORY-008) are handled in subsequent stories.

## UI Description

**Navigation path:** Projects list → click a project → Stories list → click a story → Tasks tab.

**Tasks tab — Kanban board:**
- Tasks are displayed as a Kanban board with one column per status value, ordered as defined in the project's effective `task_statuses` dictionary.
- Each card shows the task title, type badge, and assignee_role (when set).
- Dragging a card from one column to another updates the task's status immediately. If the drop target status is no longer in the dictionary, the move is rejected and an inline error is shown; the card returns to its original column.
- An aggregate counter ("N of M done") is shown above the board, fetched on demand and refreshed after every status change.
- A "New task" button opens a modal for creating a task.

**Create/Edit modal:**
- Fields: title (required, text), type (required, dropdown from `task_types`), status (required, dropdown from `task_statuses`), content (optional, Markdown textarea), assignee_role (optional, dropdown from `participant_roles`), creator_role (optional, dropdown from `participant_roles`), labels (optional, key-value pair list — same add/remove pattern used in Stories).
- Submit is disabled until title, type, and status are filled.
- On save: the board refreshes and the aggregate counter updates.
- Validation errors from the API are displayed inline next to the relevant field.

**Delete:**
- Each task card has an icon-button for delete (same icon-button primitive as Projects and Stories screens).
- Clicking delete opens a confirmation dialog ("Delete task?" with Cancel / Delete actions).
- On confirm: the task is removed from the board and the aggregate updates.

## Acceptance Criteria
- [ ] A task can be created within a story with a required title (1–500 chars), required type (from project's `task_types`), required status (from project's `task_statuses`), optional Markdown content, optional `assignee_role` and `creator_role` (both from project's `participant_roles`), and optional free-form labels
- [ ] Tasks within a story can be listed with pagination and filtered by type, status, `assignee_role`, and `creator_role`
- [ ] A single task can be retrieved by its ID
- [ ] A task's title, content, type, status, roles, and labels can be updated individually; all dictionary-validated fields are re-validated on each update
- [ ] A task can be deleted permanently
- [ ] An on-demand task-completion aggregate for a story ("N of M tasks done") can be retrieved without modifying any data
- [ ] Within a story view, tasks are grouped into Kanban columns by status, ordered as defined in the project's effective `task_statuses`; moving a task to a different column updates its status
- [ ] The create/edit modal loads all three dictionaries (`task_types`, `task_statuses`, `participant_roles`) from the project's effective settings and populates the corresponding dropdowns

## Edge Cases & Error Scenarios
- [ ] Setting a task's type or status to a value not in the respective project dictionary is rejected with a validation error listing the allowed values
- [ ] Moving a task on the Kanban board to a status column that was removed from the dictionary after the board loaded returns an error and leaves the task unchanged
- [ ] When a story is deleted, all its tasks are permanently removed
- [ ] A story with no tasks returns a zero aggregate ("0 of 0") — not an error

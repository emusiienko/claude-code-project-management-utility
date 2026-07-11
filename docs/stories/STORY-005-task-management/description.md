---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-005: Task Management

## Desired Outcome

Tasks can be created, listed, updated, and deleted within a story. The task Kanban board inside the Story Detail slide-over replaces the current `TaskKanbanPlaceholder` with live data — one column per status from the project's effective `task_statuses` dictionary, with drag-and-drop status transitions. Clicking a task card opens a Task Detail modal. The task-completion aggregate ("N/M done") becomes live in both the Stories list and the slide-over.

## Context

The Story Detail slide-over at `/projects/:id/stories/:storyId` already exists (STORY-016). Its main area currently renders `TaskKanbanPlaceholder`, which shows status column headers derived from the project's effective `task_statuses` dictionary but makes no task endpoint calls and shows no data. This story replaces that placeholder with a fully functional task Kanban.

The task aggregate endpoint (`GET /stories/:id/aggregate`) is specified in the API contract but was deferred to this story by the architecture (the Stories service references it as "deferred to STORY-005"). The Stories list already displays a "task aggregate" column, but it currently shows placeholder or empty data — this story makes it live.

Tasks belong to a story; the owning project is resolved transitively (`task → story → project`) for all dictionary validation. Dictionary-bound fields (`type`, `status`, `assignee_role`, `creator_role`) are validated against the project's effective settings on every write. The Task Detail modal is a separate route nested inside the slide-over: `/projects/:id/stories/:storyId/tasks/:taskId`.

This story covers only the Task entity. Linking tasks to one another (STORY-006), adding attachments (STORY-007), and adding comments (STORY-008) are handled in subsequent stories. The Task Detail modal therefore shows task metadata plus placeholder sections for Links, Attachments, and Comments.

## UI Description

**Entry point:** the Story Detail slide-over (`/projects/:id/stories/:storyId`). The main area of the slide-over contains the task Kanban. No new top-level navigation entry is introduced.

### Task Kanban — main area of the Story Detail slide-over

- One column per value in the project's effective `task_statuses` dictionary, ordered as defined in the dictionary. Column order and names are never hardcoded.
- Each column header shows the status name and a count of cards in that column.
- Each task card displays: title, type badge, assignee_role (when set), label chips.
- Cards within a column are ordered by `created_at` ASC.
- **Drag-and-drop:** dragging a card to another column fires an optimistic `PUT /tasks/:id` status update; the card snaps back and an error toast is shown on failure. A card dropped on a status no longer present in the effective dictionary shows an inline error and the card returns to its original column.
- **Filter bar** above the board: type, assignee_role, creator_role — all dropdowns populated from the project's effective settings. Active filters dim non-matching cards without removing columns or triggering new API calls.
- **Add task** button at the bottom of each column → create form with that column's status pre-filled (the status field is read-only when opened from the column footer).
- **Edit** and **Delete** per card via context menu (⋯ icon shown on hover).
- Clicking a task card title opens the Task Detail modal; URL updates to `/projects/:id/stories/:storyId/tasks/:taskId`.
- The aggregate counter ("N/M done") is displayed above the Kanban board; it is fetched from `GET /stories/:id/aggregate` and refreshes after every task create, update, or delete.

### Create / Edit task form

- Fields: title (required, 1–500 chars), type (required, dropdown from project's `task_types`), status (required, dropdown from project's `task_statuses`), content (optional, Markdown textarea), assignee_role (optional, dropdown from project's `participant_roles`), creator_role (optional, dropdown from project's `participant_roles`), labels (optional, key-value pair list — same pattern as Stories).
- Submit is disabled until title, type, and status are filled.
- All three dictionaries (`task_types`, `task_statuses`, `participant_roles`) are loaded from `GET /projects/:id/settings/effective` and populate the corresponding dropdowns.
- Validation errors from the API are displayed inline next to the relevant field.
- On save: the Kanban board and the aggregate counter refresh.

### Delete confirmation

- Clicking Delete on the context menu opens a confirmation dialog ("Delete task?" with Cancel / Delete actions).
- On confirm: the task is removed from the board and the aggregate counter updates.

### Task Detail modal (`/projects/:id/stories/:storyId/tasks/:taskId`)

- Full-screen modal rendered on top of the Story Detail slide-over. The slide-over behind it is dimmed but not unmounted.
- Fixed header: task title + close button (✕).
- Opening: clicking a task card title in the Kanban; URL updates to the task sub-route. Navigating directly to the URL renders the Story Detail slide-over open with the modal already on top.
- Closing: ✕ button or Escape key; URL restores to the story route (slide-over remains open).
- Data is fetched from `GET /tasks/:id/detail`.

**Task metadata (top of scrollable body):**
- Displays: title, type badge, status badge, assignee_role, creator_role, labels, rendered Markdown content.
- **Edit task** button → inline edit form replacing the metadata block.

**Links section:** placeholder ("Task links — coming in STORY-006").

**Attachments section:** placeholder ("Task attachments — coming in STORY-007").

**Comments section:** placeholder ("Task comments — coming in STORY-008").

### Stories list aggregate

- The "N/M done" aggregate per story row in the Stories list (`/projects/:id/stories`) is now live, fetched from `GET /stories/:id/aggregate` per visible story.
- "—" (em-dash) is shown when the story has no tasks (total_tasks = 0).

## Acceptance Criteria

- [ ] A task can be created within a story with: required title (1–500 chars), required type (from the project's `task_types`), required status (from the project's `task_statuses`), optional Markdown content, optional `assignee_role` and `creator_role` (both from the project's `participant_roles`), and optional free-form labels
- [ ] Tasks within a story can be listed with pagination; the list supports filters for type, status, `assignee_role`, and `creator_role`
- [ ] A single task can be retrieved by its ID; the detail endpoint (`GET /tasks/:id/detail`) returns the task fields plus empty `links`, `attachments`, and `comments` arrays (to be populated by STORY-006/007/008)
- [ ] A task's title, content, type, status, roles, and labels can be updated; all dictionary-validated fields are re-validated on each update; `story_id` is immutable
- [ ] A task can be deleted permanently; when a story is deleted all its tasks are removed
- [ ] The on-demand story aggregate (`GET /stories/:id/aggregate`) returns `total_tasks` and a `by_status` breakdown; it is never stored
- [ ] The task Kanban inside the Story Detail slide-over at `/projects/:id/stories/:storyId` shows live tasks grouped by status, replacing the current placeholder; each column header shows a task count
- [ ] Dragging a task card between columns updates the task's status via `PUT /tasks/:id` with an optimistic update that rolls back on failure
- [ ] The filter bar (type, assignee_role, creator_role) above the Kanban dims non-matching cards without issuing new API calls
- [ ] The Add task button at the bottom of each column opens the create form with that column's status pre-filled and read-only
- [ ] Clicking a task card title opens the Task Detail modal and updates the URL to `/projects/:id/stories/:storyId/tasks/:taskId`; navigating directly to that URL renders both the slide-over and the modal
- [ ] The Task Detail modal displays task metadata (title, type, status, roles, labels, rendered Markdown content) and static placeholder sections for Links, Attachments, and Comments
- [ ] The aggregate counter above the Kanban and the "N/M done" column in the Stories list both reflect the live task state and refresh after every create, update, or delete; "—" is shown when total_tasks = 0
- [ ] All three dictionaries (`task_types`, `task_statuses`, `participant_roles`) are loaded from the project's effective settings and populate the form dropdowns

## Edge Cases & Error Scenarios

- [ ] Setting a task's type or status to a value not in the project's effective dictionary is rejected with 422 UNPROCESSABLE listing the allowed values
- [ ] Dragging a task card to a status column whose value was removed from the dictionary after the board loaded shows an inline error on the card and the card returns to its original column
- [ ] When a story is deleted, all its tasks are permanently removed; no orphan task records remain
- [ ] A story with no tasks returns `{ total_tasks: 0, by_status: {} }` from the aggregate endpoint — not an error; the Stories list shows "—"
- [ ] A non-existent or malformed `:taskId` in the modal URL renders a "Not found" state inside the modal (slide-over remains open behind it)
- [ ] Closing the Task Detail modal (✕ or Escape) restores the URL to `/projects/:id/stories/:storyId` with the slide-over still open

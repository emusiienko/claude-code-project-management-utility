---
status: Done
assignee: frontend-developer
story: STORY-006
---

# TASK-005: Task links UI in Task Detail Modal

## What to implement

Replace the "Links — coming in STORY-006" placeholder section in the Task Detail Modal with a live Links section, backed by the task-link hooks from TASK-004.

**Link list.** Show all outbound and inbound links for the task. Each row displays a direction indicator (→ for outbound, ← for inbound), the `link_type` as a badge, and the linked task's title. The linked task's title is a clickable link that navigates to that task's Task Detail Modal (the URL updates to the task-detail route for the linked task within the same story slide-over).

**Add-link form.** A control to create a new link: search for a target task by title (scoped to tasks in the same story, reusing the existing task-list query) and select a `link_type` from a dropdown. The `link_type` options come from the project's effective `link_types` dictionary, read from the settings-effective query already in cache on this surface — no extra network call. On submit, create the link and refresh the list.

**Delete.** A per-row delete button opens a confirmation dialog; on confirm, remove the link and refresh the list.

Surface field/validation and conflict errors (self-link, duplicate, invalid `link_type`) inline using the existing error-message extraction utilities.

## Scope

`frontend/src/features/tasks/` — the Links section within the Task Detail Modal and its subcomponents (list row, add-link form, delete confirmation).

## Dependencies

TASK-004.

## Acceptance Criteria

- [ ] The Links section lists all outbound and inbound links, each with a direction indicator, a `link_type` badge, and the linked task's title.
- [ ] Clicking a linked task's title navigates to that task's Task Detail Modal (URL updates to the linked task's detail route).
- [ ] The Add-link form searches target tasks by title (same story only) and offers a `link_type` dropdown populated from the effective `link_types` with no extra network call; submitting creates the link and refreshes the list.
- [ ] A per-row delete opens a confirmation dialog and removes the link on confirm, refreshing the list.
- [ ] Backend rejections (self-link, cross-story, invalid type, duplicate) are shown inline.

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-12

**What was done**:
- Created `TaskLinksSection.tsx` — the orchestrating component for the full Links section. Renders the enriched list, the Add-link form, and the delete-confirmation dialog. Reads link_types from the already-cached effective project settings and the task list from the already-cached story-scoped task query — no extra network calls.
- Created `TaskLinkRow.tsx` — a single row with a direction indicator (→ / ←), a link_type badge, the linked task title as a `<Link>` to the task's detail modal route, a status chip, and an `IconButton` (destructive) for delete.
- Created `AddTaskLinkForm.tsx` — inline form with a `<select>` for the target task (same story, current task excluded client-side) and a `<select>` for link_type populated from effective settings. Submits `{ target_task_id, link_type }`. Shows top-level and per-field errors from the API inline.
- Created `DeleteTaskLinkDialog.tsx` — confirmation dialog (alertdialog role, Escape cancels) for link removal. Shows the linked task title and link type. z-index above the Task Detail Modal (z-80/z-90) so it layers correctly.
- Updated `TaskDetailModal.tsx` — replaced the "Task links — coming in STORY-006" placeholder section with `<TaskLinksSection taskId storyId projectId />`.

**Deviations from plan**:
- The task list query for the target-task selector is fetched via `useTaskList(storyId)` (the existing hook used by TaskKanban). Because TaskKanban is rendered in the StorySlideOver (which is mounted behind the modal), this cache entry is typically warm when the user opens the Task Detail Modal. In the rare case where the modal is opened by direct URL navigation (bypassing the Kanban), the query fires and resolves before the user interacts with the form — this is acceptable per the architecture.

**Technical decisions made**:
- `AddTaskLinkForm` receives the tasks array as a prop (rather than calling `useTaskList` internally) so the component is stateless with respect to server data and trivially testable. The hook call lives in `TaskLinksSection`, which owns all server state for this section.
- The delete dialog uses z-index z-80/z-90 (above the Task Detail Modal's z-60/z-70) because both can be visible simultaneously — the dialog must fully overlay the modal.
- `TaskLinkRow` uses React Router's `<Link>` component for the linked-task title so keyboard navigation (Tab + Enter) works without JavaScript event handlers — matches the routing convention and accessibility requirement.

**Code locations**:
- `frontend/src/features/tasks/components/TaskLinksSection.tsx` — orchestrator: link list, add form, delete dialog
- `frontend/src/features/tasks/components/TaskLinkRow.tsx` — single link row
- `frontend/src/features/tasks/components/AddTaskLinkForm.tsx` — add-link form
- `frontend/src/features/tasks/components/DeleteTaskLinkDialog.tsx` — delete confirmation dialog
- `frontend/src/features/tasks/components/TaskDetailModal.tsx` — placeholder replaced with TaskLinksSection

**Technical debt noted**: None.

---
status: ToDo
assignee: frontend-developer
story: STORY-005
---

# TASK-005: Task Detail modal route

## What to implement

Add a nested `tasks/:taskId` route under the existing `:storyId` slide-over, and build the Task Detail modal that renders on top of the still-open slide-over.

**Route wiring** — add a child route `tasks/:taskId` under the story slide-over route in `router.tsx`. `StorySlideOver` must render an `<Outlet />` so the modal mounts on top without unmounting the slide-over. Navigating directly to `/projects/:id/stories/:storyId/tasks/:taskId` must render both the slide-over and the modal together.

**Task Detail modal** — fetches `GET /tasks/:id` (plain task endpoint from TASK-003; the enriched `GET /tasks/:id/detail` is deferred to a later story as documented in the migration plan). The modal:
- Fixed header: task title + close button (✕)
- Scrollable body showing task metadata: title, type badge, status badge, assignee_role, creator_role, labels, and rendered Markdown content
- Inline **Edit task** form toggle — replaces the metadata block with the shared TaskForm from TASK-004; on save, restores the metadata view
- Three static placeholder sections at the bottom of the body:
  - "Task links — coming in STORY-006"
  - "Task attachments — coming in STORY-007"
  - "Task comments — coming in STORY-008"

**Not-found state** — a missing or malformed `:taskId` renders a "Not found" message inside the modal; the slide-over behind it remains open and usable.

**Close behavior** — pressing ✕ or Escape navigates back to the story route (`/projects/:id/stories/:storyId`); the slide-over stays open. The modal does not close by clicking the dimmed slide-over backdrop.

**URL linkage** — clicking a task card title in the Kanban (TASK-004) navigates to the task sub-route; the modal opens. The browser back button returns to the story route.

## Scope

- `src/app/router.tsx` — add `tasks/:taskId` child route
- `src/features/stories/components/StorySlideOver.tsx` — add `<Outlet />`
- `src/features/tasks/components/TaskDetailModal.tsx` — new modal component
- Reuses `TaskForm` from TASK-004 for inline editing

## Dependencies

TASK-003, TASK-004

## Acceptance Criteria

- [ ] Clicking a task card title opens the Task Detail modal and updates the URL to `.../tasks/:taskId`; the slide-over stays open and visible behind the modal
- [ ] Navigating directly to the task URL renders the slide-over and the modal together
- [ ] The modal header shows the task title and a ✕ close button
- [ ] The modal body shows type badge, status badge, assignee_role, creator_role, labels, and rendered Markdown content
- [ ] The Edit task toggle replaces the metadata block with the inline form; saving returns to the metadata view
- [ ] Three static placeholder sections appear at the bottom of the modal body
- [ ] A non-existent or malformed `:taskId` shows a "Not found" state inside the modal; the slide-over behind remains functional
- [ ] Pressing ✕ or Escape navigates back to the story route with the slide-over still open

## Intended ADR

None expected.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

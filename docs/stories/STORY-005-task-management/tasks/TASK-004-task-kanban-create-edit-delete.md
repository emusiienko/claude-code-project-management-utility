---
status: ToDo
assignee: frontend-developer
story: STORY-005
---

# TASK-004: Task Kanban + create/edit form + delete in the slide-over

## What to implement

Replace `TaskKanbanPlaceholder` in the Story Detail slide-over with a fully functional, dictionary-driven Task Kanban including drag-and-drop status transitions, a filter bar, per-column Add, per-card Edit/Delete, a create/edit form, a delete confirmation dialog, and the aggregate counter above the board.

**Kanban board** — one column per value in the project's effective `task_statuses` dictionary, in dictionary order. Column names and order are never hardcoded; they come from `GET /projects/:id/settings/effective`. Each column header shows the status name and a live card count. Cards within a column are ordered by `created_at` ASC and display: title, type badge, assignee_role (when set), and label chips.

**Drag-and-drop** — reuse the existing board drag hook. That hook is already domain-agnostic (it takes `validStatuses` plus `onStatusChange` / `onInvalidDrop` callbacks and knows nothing about `Story` or `Task`). Promote it to a **shared kanban-drag hook in `src/shared/hooks/`** and switch the Board to re-export it from that shared location — a mechanical move with no behavior change — then consume the shared hook here. This avoids a cross-feature import from `features/board/` into `features/tasks/`. The optimistic status update uses the update mutation from TASK-003 with `onMutate`/`onError` rollback, following the same shape as the Board. A card dropped on a status no longer present in the effective dictionary shows an inline error on the card and the card returns to its original column. The drag wiring lives in the shared hook, not in JSX.

Do NOT restructure the accepted Board's columns, cards, or page — the only Board change permitted here is moving the drag hook to `shared` and re-exporting it. `TaskColumn` and `TaskCard` are new components owned by the `tasks` feature, built directly on dnd-kit's `useDroppable` / `useSortable` and mirroring the Board's structure. Do not extract a generic shared `<KanbanBoard>` component — the two kanbans share only the drag mechanic, not their column/card shape.

**Filter bar** — above the board: type, assignee_role, creator_role dropdowns populated from the project's effective settings. Active filters dim non-matching cards purely client-side — no new API calls.

**Add task** — an "Add task" button at the bottom of each column opens the create form with that column's status pre-filled and the status field read-only. Clicking a task card's title navigates to the task detail modal (URL update to `.../tasks/:taskId` — rendering handled in TASK-005).

**Per-card context menu** — Edit (⋯ icon, shown on hover) and Delete; use the shared `IconButton` primitive.

**Create / Edit form** — one cohesive form component owning its state: title (required, 1–500 chars), type (required, dropdown from `task_types`), status (required, dropdown from `task_statuses`), content (optional Markdown textarea), assignee_role (optional, `participant_roles`), creator_role (optional, `participant_roles`), labels (reusing shared `LabelsEditor`). Submit is enabled once title, type, and status are filled. API validation errors render inline next to the relevant field. All three dictionaries load from `GET /projects/:id/settings/effective`.

**Delete confirmation dialog** — "Delete task?" with Cancel / Delete actions; on confirm calls the delete mutation; closes the dialog and the board refreshes.

**Aggregate counter** — display "N/M done" above the Kanban using the `useStoryAggregate` hook from TASK-003. Refreshes after every task create, update, or delete. Shows "—" when `total_tasks === 0`. "done" count is `by_status["done"]` when present, else 0.

## Scope

- `src/shared/hooks/` — promote the Board's drag hook here as a shared kanban-drag hook (move + rename to a domain-agnostic name)
- `src/features/board/` — switch the Board to re-export / import the drag hook from `src/shared/hooks/` (mechanical; no other Board changes)
- `src/features/tasks/components/` — TaskKanban, TaskColumn, TaskCard, TaskForm, DeleteTaskDialog, TaskFilterBar (TaskColumn/TaskCard built on dnd-kit primitives, not on a shared kanban component)
- `src/features/tasks/hooks/` — aggregate display logic (drag hook is consumed from `src/shared/hooks/`)
- `src/features/stories/components/StoryRightPanel.tsx` — replace `TaskKanbanPlaceholder` import/render

## Dependencies

TASK-003

## Acceptance Criteria

- [ ] The Board's drag hook is moved to `src/shared/hooks/` and the Board consumes it from there with no behavior change; the Task Kanban consumes the same shared hook (no cross-feature import from `features/board/`, no duplicated drag hook)
- [ ] No generic shared `<KanbanBoard>` component is introduced; `TaskColumn` / `TaskCard` are owned by the `tasks` feature; the accepted Board's columns/cards/page are otherwise unchanged
- [ ] The Kanban renders one column per effective `task_statuses` value; column names match the dictionary exactly; column order matches dictionary order
- [ ] Each column header shows the live card count
- [ ] Cards show title, type badge, assignee_role (when set), and label chips
- [ ] Dragging a card to another column fires an optimistic status update; the card snaps back on API failure with an inline error
- [ ] A card dropped on a status removed from the dictionary after load shows an inline error and returns to its original column
- [ ] The filter bar dims non-matching cards without triggering new API calls
- [ ] The Add task button pre-fills the status field with the column's value and makes it read-only
- [ ] The create form validates title (1–500), requires type and status, and shows inline API errors
- [ ] Editing a task updates the card in place after save
- [ ] Delete confirmation dialog fires the delete mutation and removes the card on confirm
- [ ] The aggregate counter above the board shows "N/M done" and updates after every create / update / delete; shows "—" when no tasks

## Intended ADR

None expected (reuse of established board drag pattern).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

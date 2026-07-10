---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-007: Board view

## What to implement

Build the Board tab at `/projects/:id/board`, rendered inside ProjectShell.

- Render all project stories as a kanban with one column per effective story status. Derive columns
  from the project's effective `story_statuses` dictionary — do not hardcode a status list.
- Each card shows the story title, its labels, and a task aggregate.
- Drag-and-drop a card between columns updates that story's status using the existing story-update
  operation (`PUT /v1/stories/:id`). Apply the change optimistically so the card moves immediately,
  and roll back on error.
- Clicking a card opens the Story Detail slide-over by navigating to `/projects/:id/stories/:storyId`
  (same trigger as the Stories list title; the slide-over is built in TASK-008).
- Columns remain accessible via horizontal scroll if needed, regardless of sidebar collapsed state.

## Scope

Frontend Board kanban view with drag-and-drop status updates. Uses the already-installed drag-and-drop
library and the existing story-update path. No backend, no API contract changes, no new dependencies.

## Dependencies

TASK-004

## Acceptance Criteria

- [ ] `/projects/:id/board` shows all project stories as a kanban with one column per effective story
      status (columns derived from the project's `story_statuses` dictionary, not hardcoded)
- [ ] Each card shows title, labels, and a task aggregate
- [ ] Dragging a card to another column updates the story status via `PUT /v1/stories/:id` with an
      optimistic update that rolls back on error
- [ ] Clicking a card opens the Story Detail slide-over at `/projects/:id/stories/:storyId`
- [ ] Board columns remain usable (horizontal scroll if needed) regardless of sidebar collapsed state

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
Implemented the full Board kanban view at `/projects/:projectId/board`. The board renders one column per effective `story_statuses` dictionary value, derived from the project's effective settings (never hardcoded). Drag-and-drop between columns fires an optimistic status update via the existing `useUpdateStory` mutation, with cache rollback on error. Invalid drops (target status removed from the dictionary) show an inline error on the card. Clicking a card title navigates to the story detail route. The board canvas is horizontally scrollable.

**Deviations from plan**:
None.

**Technical decisions made**:

1. **Separate `useBoardStories` hook** — the board fetches all stories with `PAGINATION.BOARD_STORIES = 100` (API max). Used a dedicated cache key `{ board: true }` to avoid sharing the list cache with the Stories page, which uses a different page size and supports filters. This avoids cache collisions and unexpected stale-data issues between the two views.

2. **Column droppable id convention `col-<status>`** — Prefixing column droppable ids distinguishes them from card ids (plain story UUIDs). The drag handler uses this prefix to resolve the target status. When a card is dropped on another card (not a column's empty area), the fallback reads `over.data.current.status` injected by `useSortable`'s `data` prop.

3. **Drag logic isolated in `useBoardDrag` hook** — all dnd-kit sensor configuration, active-card tracking, and drag-end resolution live in the hook. The page component only provides callbacks (`onStatusChange`, `onInvalidDrop`), keeping the JSX declarative.

4. **Optimistic update via direct `queryClient.setQueryData` / rollback** — used the manual snapshot-and-restore pattern (save prior data → mutate cache → on error restore) rather than `onMutate` in the mutation itself, because the optimistic update is initiated from a callback (`handleStatusChange`) and the mutation hook is shared with the Stories page which has different cache semantics.

5. **`PAGINATION.BOARD_STORIES` added to `apiConfig.ts`** — a named constant documents the intent and makes the limit easy to change without hunting for the raw number.

**Code locations**:
- `frontend/src/features/board/BoardPage.tsx` — page entry, DndContext, column layout, error/loading/empty states
- `frontend/src/features/board/components/BoardColumn.tsx` — droppable column with SortableContext
- `frontend/src/features/board/components/BoardCard.tsx` — draggable story card (useSortable, title click, labels, inline error)
- `frontend/src/features/board/hooks/useBoardDrag.ts` — dnd-kit sensors, handleDragStart/End, status resolution
- `frontend/src/features/board/hooks/useBoardStories.ts` — TanStack Query hook for board-specific story fetch
- `frontend/src/config/apiConfig.ts` — added `PAGINATION.BOARD_STORIES = 100`
- `frontend/src/app/router.tsx` — replaced `<Navigate>` placeholder with `<BoardPage />`

**Technical debt noted**:
- The board fetches a maximum of 100 stories (API limit). Projects with > 100 stories will silently show only the first 100. A future story should add pagination, cursor-based loading, or kanban virtualization. The `PAGINATION.BOARD_STORIES` constant makes the limit visible.
- Stories with `status: null` or a status not in any active column are silently excluded from the board. A future improvement could show an "Unassigned" column.

---
status: ToDo
assignee: frontend-developer
story: STORY-005
---

# TASK-006: Stories list live aggregate

## What to implement

Replace the static "N/A" task-aggregate cell in the Stories list with a live "N/M done" counter per visible story.

**Per-story aggregate fetch** — for each story currently visible in the Stories list (`/projects/:id/stories`), call `GET /stories/:id/aggregate` via the `useStoryAggregate` hook from TASK-003. Each story row owns its own query instance keyed by story ID; queries are independent (no shared batch call).

**Counter display** — show "N/M done" in the aggregate column, where N is `by_status["done"]` (0 if the key is absent) and M is `total_tasks`. Show "—" (em-dash) when `total_tasks === 0` — not "0/0". The display degrades gracefully if the project has renamed its terminal status (the counter uses whatever `"done"` key returns, which may be 0 if the project uses a different terminal status name — this is acceptable per the implementation plan).

**Refresh behavior** — all task mutations (create, update, delete) from TASK-003 already invalidate the story aggregate cache key; this task only needs to ensure the Stories list reads from the same cache key so invalidation propagates automatically.

**Loading state** — while the aggregate is fetching, show a subtle loading indicator (e.g., "—" or a spinner) in the cell; do not block the rest of the row from rendering.

## Scope

- `src/features/stories/components/StoryList.tsx` (or equivalent) — replace static aggregate cell with live counter
- No new hooks needed; consumes `useStoryAggregate` from TASK-003

## Dependencies

TASK-003

## Acceptance Criteria

- [ ] Each story row in the Stories list shows a live "N/M done" counter fetched from `GET /stories/:id/aggregate`
- [ ] A story with no tasks shows "—" (em-dash), not "0/0"
- [ ] The counter updates after a task is created, updated, or deleted in the Kanban (no page refresh needed)
- [ ] While loading, the cell degrades gracefully (no layout shift, no crash)
- [ ] The counter is correct for all visible stories simultaneously

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

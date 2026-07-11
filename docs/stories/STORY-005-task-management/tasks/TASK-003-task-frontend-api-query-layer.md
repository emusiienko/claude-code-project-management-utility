---
status: ToDo
assignee: frontend-developer
story: STORY-005
---

# TASK-003: Task frontend API + query layer

## What to implement

Build the complete frontend data layer for tasks and the story aggregate — endpoint functions, type definitions, cache configuration, and TanStack Query hooks.

**Types** — add `Task`, `CreateTask`, `UpdateTask`, and `StoryAggregate` TypeScript interfaces to `src/api/types.ts`, derived exactly from the locked v1.0 API contract. No shape changes.

**API paths** — add all task and aggregate URL templates to `src/api/paths.ts` under `API_PATHS`.

**Endpoint functions** — add a `tasks` endpoints module with plain async functions for five task operations (create, list-by-story, get, update, delete) plus one aggregate function (`getStoryAggregate`). Each function unwraps the `{ data }` envelope. Functions consume `API_PATHS`; shapes match the contract types.

**Cache configuration** — register cache keys for tasks (list, detail) and for the story aggregate in `src/config/cacheConfig.ts` (`CACHE_KEYS`); add stale times for tasks and the aggregate to `src/api/api_config.ts` (`DATA_FRESHNESS`).

**TanStack Query hooks** — create a `useTasksQuery` module (or equivalent) in the tasks feature providing:
- List query hook (by story ID, with filter params)
- Get-by-ID query hook
- Create mutation — invalidates the task list and the story aggregate for the owning story on success
- Update mutation with **optimistic status update**: on `onMutate` apply the new status to the cache immediately; on `onError` roll back to the snapshot; on `onSettled` invalidate the task list and aggregate
- Delete mutation — invalidates the task list and aggregate on success
- Story aggregate query hook (`useStoryAggregate`) — takes `storyId`; returns `StoryAggregate`; invalidated by all three task mutations

All task mutations must invalidate both the per-story task list and the story aggregate so the Kanban and the "N/M done" counter stay in lockstep.

## Scope

- `src/api/types.ts` — add task + aggregate interfaces
- `src/api/paths.ts` — add task + aggregate URL paths
- `src/api/endpoints/tasks.ts` — new endpoint functions module
- `src/api/api_config.ts` — add task + aggregate stale times
- `src/config/cacheConfig.ts` — add task + aggregate cache keys
- `src/features/tasks/hooks/useTasks.ts` (or equivalent) — TanStack Query hooks

## Dependencies

TASK-001, TASK-002

## Acceptance Criteria

- [ ] All five task endpoint functions call the correct contract URLs and return the correctly typed responses
- [ ] `getStoryAggregate` calls `GET /v1/stories/:id/aggregate` and returns a `StoryAggregate`
- [ ] Cache keys and stale times are registered for tasks and the aggregate
- [ ] Create, update, and delete mutations all invalidate both the task list and the story aggregate
- [ ] The optimistic update applies immediately on drag-and-drop and rolls back on API error
- [ ] All hooks are typed — no `any` in public interfaces

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

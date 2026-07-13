---
status: Done
assignee: frontend-developer
story: STORY-006
---

# TASK-004: Frontend link API + query layer

## What to implement

The API and data-access layer for both link surfaces, following the established endpoints → hooks layering. No UI in this task.

**Contract types.** The task-link contract types (`TaskLink`, `EnrichedTaskLink`, `TaskDetail.links`) already exist. Add the story-link equivalents — a story-link entity and its enriched (direction + linked-story summary) shape — and add a `links` field to the story-detail type, matching the backend responses from TASK-002/TASK-003.

**Endpoint functions.** Plain async functions for both surfaces:
- task links: create (`POST /tasks/:taskId/links`), list (`GET /tasks/:taskId/links` with `direction`/`link_type`/pagination), delete (`DELETE /task-links/:id`).
- story links: create (`POST /stories/:storyId/links`), list (`GET /stories/:storyId/links` with the same params), delete (`DELETE /story-links/:id`).

List functions return the full list envelope so pagination metadata is available. Add all new URL strings to the centralized paths module and any new cache keys to the cache-key registry.

**Query hooks.** TanStack Query hooks for each surface: a list query (enriched links for the viewed task/story) and create/delete mutations. On a successful create or delete, invalidate the relevant link-list query and the corresponding detail query (task detail / story detail) so the `links` collection and the section both refresh.

## Scope

`frontend/src/api/` (contract types, endpoint functions, paths, cache keys) and the link query hooks. No components.

## Dependencies

TASK-001, TASK-002 (endpoints must exist to type against).

## Acceptance Criteria

- [ ] Story-link contract types and a `links` field on the story-detail type exist and match the backend response shapes; task-link types remain as-is.
- [ ] Endpoint functions exist for create/list/delete on both the task-link and story-link surfaces; list functions expose pagination metadata.
- [ ] All new URLs live in the centralized paths module; all new cache keys live in the cache-key registry.
- [ ] List-query and create/delete-mutation hooks exist for both surfaces; mutations invalidate both the link list and the relevant detail query on success.

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-12

**What was done**:
- Added `StoryLink` and `EnrichedStoryLink` entity types to `src/api/types.ts` (mirroring the existing `TaskLink`/`EnrichedTaskLink` shape but scoped to stories).
- Added `CreateStoryLink` request-body type to `src/api/types.ts`.
- Extended `StoryDetail` with a `links: EnrichedStoryLink[]` field, matching the backend response from TASK-002.
- Added `TASK_LINKS`, `TASK_LINK`, `STORY_LINKS`, and `STORY_LINK` entries to `src/api/paths.ts`.
- Added `storyLinks` section to `src/config/cacheConfig.ts`.
- Added `TASK_LINKS` and `STORY_LINKS` page-size entries to `PAGINATION` in `src/config/apiConfig.ts`.
- Added `TASK_LINKS` and `STORY_LINKS` stale-time entries to `DATA_FRESHNESS` in `src/config/apiConfig.ts`.
- Created `src/api/endpoints/taskLinks.ts` with `createTaskLink`, `listTaskLinks`, `deleteTaskLink` plain async functions.
- Created `src/api/endpoints/storyLinks.ts` with `createStoryLink`, `listStoryLinks`, `deleteStoryLink` plain async functions.
- Created `src/features/task-links/hooks/useTaskLinks.ts` with `useTaskLinkList`, `useCreateTaskLink`, `useDeleteTaskLink` TanStack Query hooks.
- Created `src/features/story-links/hooks/useStoryLinks.ts` with `useStoryLinkList`, `useCreateStoryLink`, `useDeleteStoryLink` TanStack Query hooks.

**Deviations from plan**: None. The plan called for `features/task-links/hooks/useTaskLinks.ts` and `features/story-links/hooks/useStoryLinks.ts` — delivered as specified.

**Technical decisions made**:
- Mutations invalidate both the link list (`CACHE_KEYS.taskLinks.list` / `CACHE_KEYS.storyLinks.list`) and the parent item's rich-detail (`CACHE_KEYS.tasks.richDetail` / `CACHE_KEYS.stories.richDetail`) on success, per the task spec. The rich-detail key is the one used by `useTaskDetail`/`useStoryDetail` hooks and is what populates the `links` field in the detail modal and slide-over.
- `STORY_LINKS` folder created as a new feature folder (`features/story-links/`) rather than nesting under `features/stories/`, following the one-domain-per-folder convention and keeping the story-links surface cleanly separable.
- `StoryDetail.links` uses `EnrichedStoryLink[]` — the enriched shape matches what the backend returns from `GET /stories/:id/detail` (TASK-002 implementation adds this field).

**Code locations**:
- `frontend/src/api/types.ts` — `StoryLink`, `EnrichedStoryLink`, `CreateStoryLink`, `StoryDetail.links`
- `frontend/src/api/paths.ts` — `TASK_LINKS`, `TASK_LINK`, `STORY_LINKS`, `STORY_LINK`
- `frontend/src/config/cacheConfig.ts` — `storyLinks` section
- `frontend/src/config/apiConfig.ts` — `PAGINATION.TASK_LINKS`, `PAGINATION.STORY_LINKS`, `DATA_FRESHNESS.TASK_LINKS`, `DATA_FRESHNESS.STORY_LINKS`
- `frontend/src/api/endpoints/taskLinks.ts` — task-link endpoint functions
- `frontend/src/api/endpoints/storyLinks.ts` — story-link endpoint functions
- `frontend/src/features/task-links/hooks/useTaskLinks.ts` — task-link TanStack Query hooks
- `frontend/src/features/story-links/hooks/useStoryLinks.ts` — story-link TanStack Query hooks

**Technical debt noted**: None.

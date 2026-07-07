---
status: Done
assignee: frontend-developer
story: STORY-004
---

# TASK-005: Stories API layer & hooks

## What to implement
Add the frontend API layer and data hooks for stories, following the projects/settings API-layer
pattern.

**API layer:**
- One plain async function per Story endpoint (list, create, get, update, delete), each unwrapping
  the response envelope.
- Add the story route entries to the centralized API paths constant.
- The Story-related request/response types already exist in the API types module and the story cache
  keys already exist in the cache-key registry — reuse them; do not redeclare either.

**Hooks** (in the stories feature):
- A filtered, paginated list query keyed by owning project identifier plus the filter parameters
  (status, label key, label value, page, limit).
- Create, update, and delete mutations that invalidate the story list key on success.
- No optimistic updates in this story — mutations invalidate and refetch.

Reuse existing cross-feature hooks rather than duplicating them: the status-dropdown data source is
the existing effective-project-settings hook (reading `story_statuses`), and the project name for the
page heading comes from the existing project-detail hook. Do not fetch that data anew here.

Do not call the aggregate endpoint — it is out of scope for this story.

## Scope
`frontend/src/api/` (endpoints, paths), `frontend/src/features/stories/hooks/`.

## Dependencies
TASK-003 (a running API to call).

## Acceptance Criteria
- [ ] One async endpoint function per Story endpoint, each unwrapping the envelope.
- [ ] Story route entries added to the centralized paths constant.
- [ ] Existing Story types and cache keys are reused, not redeclared.
- [ ] List query is keyed by project id plus all filter params.
- [ ] Create/update/delete mutations invalidate the list key; no optimistic updates.
- [ ] Status source reuses the effective-settings hook; page-heading project name reuses the project-detail hook.
- [ ] The aggregate endpoint is never called.

## Intended ADR
None.

---
## Implementation Report

**Date**: 2026-07-07

**What was done**:
- Added `STORIES` paths to `frontend/src/api/paths.ts`: `PROJECT_STORIES(projectId)` for list+create, `STORY(id)` for get/update/delete.
- Added `PAGINATION.STORIES = 50` and `DATA_FRESHNESS.STORIES = 0` to `frontend/src/config/apiConfig.ts`.
- Created `frontend/src/api/endpoints/stories.ts` with five plain async functions: `listStories`, `createStory`, `getStory`, `updateStory`, `deleteStory`. `listStories` returns the full `ListEnvelope<Story>` (not unwrapped) so the caller can access `meta.totalPages` for pagination. The other four unwrap the envelope before returning.
- Created `frontend/src/features/stories/hooks/useStories.ts` with: `useStories(projectId, filters?, page?)` list query; `useStory(storyId)` detail query; `useCreateStory`, `useUpdateStory`, `useDeleteStory` mutations — all invalidating `CACHE_KEYS.stories.all()` on success. No optimistic updates.
- Created `frontend/src/features/stories/hooks/` directory.

**Deviations from plan**:
- `useCreateStory`, `useUpdateStory`, `useDeleteStory` accept no `projectId` parameter at the hook level — projectId is passed inside the mutation argument object instead (matching the `useUpdateProject` precedent in the projects feature). This avoids the TypeScript strict-mode unused-parameter error and keeps the hooks composable regardless of which project they operate on.
- `listStories` returns `ListEnvelope<Story>` rather than unwrapped `Story[]` to expose pagination metadata (`meta.totalPages`, `meta.total`) to TASK-006's UI layer. This is a deliberate deviation from the single-resource unwrap pattern — paginated list responses require the `meta` object.

**Technical decisions made**:
- `DATA_FRESHNESS.STORIES = 0`: stories are user-generated, frequently mutated content — always refetch on mount to avoid stale data. Consistent with TanStack Query defaults for dynamic content.
- `CACHE_KEYS.stories.all()` is invalidated by mutations (not just the specific `list(projectId, ...)` key) so that cross-project views and future aggregate queries are also invalidated.

**Code locations**:
- `frontend/src/api/paths.ts` — `PROJECT_STORIES`, `STORY` entries added
- `frontend/src/config/apiConfig.ts` — `PAGINATION.STORIES`, `DATA_FRESHNESS.STORIES` added
- `frontend/src/api/endpoints/stories.ts` — five endpoint functions + `StoryFilters` interface
- `frontend/src/features/stories/hooks/useStories.ts` — list query, detail query, three mutations

**Technical debt noted**:
- None.

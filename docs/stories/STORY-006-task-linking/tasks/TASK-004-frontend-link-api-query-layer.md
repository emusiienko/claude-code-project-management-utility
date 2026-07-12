---
status: ToDo
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
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

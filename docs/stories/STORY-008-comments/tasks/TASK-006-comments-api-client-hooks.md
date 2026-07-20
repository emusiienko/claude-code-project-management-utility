---
status: Done
assignee: frontend-developer
story: STORY-008
---

# TASK-006: Comments API client and hooks

## What to implement
Add the frontend data-access layer for comments, matching the attachments feature's endpoint/hook
pattern.

- Endpoint functions for the full comment surface: create (carrying optional `in_reply_to`), list
  (returning the full envelope for pagination metadata; accepting `label_key`, `label_value`,
  `after_id`, `descendant_of`, `page`, `limit`), get one, get ancestors, update, delete.
- TanStack Query hooks: a container-scoped comment list query, a single-comment query, an ancestors
  query, and create / update / delete mutations. Mutations invalidate the container's comment list
  and the matching parent rich-detail cache (story / task / milestone), consistent with the
  attachments hooks.
- API types for `Comment` (including `ancestors`, `container_type`, `container_id`), `CreateComment`
  (with `in_reply_to`), and `UpdateComment`, plus cache-key registration in the cache-keys registry.

## Scope
Frontend API client + query/mutation hooks + types for the comments feature. No UI components.

## Dependencies
TASK-003.

## Acceptance Criteria
- [ ] Every comment endpoint has a typed client function and returns the contract shapes.
- [ ] The list function exposes pagination metadata and the `label_key` / `label_value` /
  `after_id` / `descendant_of` filters.
- [ ] Create / update / delete mutations invalidate the container comment list and the parent
  rich-detail cache.
- [ ] Types include `ancestors` and both create/update input shapes; cache keys are registered.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**:
Added the full frontend data-access layer for the Comments feature, matching the attachments
feature's endpoint/hook pattern exactly:
- `src/api/types.ts` — updated `Comment` (was stale from the v1.0 contract) to `author_role: string`
  (required, immutable) and added `ancestors: string[]` (root-first materialized reply path).
  Updated `CreateComment` to require `author_role` and added the request-only `in_reply_to?: string`.
  `UpdateComment` unchanged (`content?`, `labels?` only — `author_role`/`ancestors` are immutable and
  intentionally absent from the input type).
- `src/api/paths.ts` — added `STORY_COMMENTS`, `TASK_COMMENTS`, `MILESTONE_COMMENTS`, `COMMENT`,
  `COMMENT_ANCESTORS` path builders.
- `src/api/endpoints/comments.ts` (new) — plain async functions: `listComments` (container-scoped,
  returns the full `ListEnvelope<Comment>` with `label_key`/`label_value`/`after_id`/`descendant_of`
  filters), `createComment`, `getComment`, `getCommentAncestors` (bare `Comment[]`, no envelope — per
  the API's unpaginated ancestors endpoint), `updateComment`, `deleteComment`.
- `src/config/cacheConfig.ts` — added `comments.ancestors(id)` alongside the existing `comments.list`
  and `comments.detail` keys.
- `src/config/apiConfig.ts` — added `PAGINATION.COMMENTS` (50, matching the backend's generous
  per-container default) and `DATA_FRESHNESS.COMMENTS` (0 — always fresh, consistent with other
  user-generated content like tasks/task-links/story-links).
- `src/features/comments/hooks/useComments.ts` (new) — `useCommentList` (container-scoped, paginated,
  filtered), `useComment` (single fetch, for the future permalink resolver), `useCommentAncestors`
  (disabled by default, caller passes `enabled`), `useCreateComment`, `useUpdateComment`,
  `useDeleteComment`. All three mutations invalidate the container's comment list and the matching
  parent rich-detail cache (`stories.richDetail` / `tasks.richDetail` / `milestones.richDetail`),
  mirroring `useAttachments.ts`'s `invalidateContainer` helper.

**Deviations from plan**: None. Followed the implementation plan's proposed API surface and the
already-Done backend (TASK-001–003) schemas/routes exactly (verified against
`backend/app/comments/schema.py` and `controller.py`).

**Technical decisions made**:
- `useUpdateComment` also invalidates `CACHE_KEYS.comments.detail(id)` in addition to the container
  invalidation shared with create/delete — comments are the first container-scoped entity in this
  feature set with an update mutation, and a standalone single-comment query exists (for the future
  permalink resolver), so its cache must be kept in sync too.
- `getCommentAncestors` returns a bare array (not `ListEnvelope`) since the ancestors endpoint is
  intentionally unpaginated per the implementation plan (bounded by thread depth, not a listable
  collection) — the endpoint function's return type reflects that directly rather than forcing it
  into the envelope shape used elsewhere.

**Code locations**:
- `frontend/src/api/types.ts`
- `frontend/src/api/paths.ts`
- `frontend/src/api/endpoints/comments.ts`
- `frontend/src/config/cacheConfig.ts`
- `frontend/src/config/apiConfig.ts`
- `frontend/src/features/comments/hooks/useComments.ts`

**Technical debt noted**: None. Baseline test suite (`npx vitest run`, 201 tests / 20 files) passed
before and after this change with no regressions; `npm run build` (`tsc --noEmit && vite build`)
passes clean. No UI components are added in this task (scoped to TASK-007+).

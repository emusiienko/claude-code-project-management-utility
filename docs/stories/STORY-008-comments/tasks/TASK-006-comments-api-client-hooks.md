---
status: ToDo
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
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

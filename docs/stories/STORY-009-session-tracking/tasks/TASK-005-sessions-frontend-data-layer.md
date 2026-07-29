---
status: ToDo
assignee: frontend-developer
story: STORY-009
---

# TASK-005: Sessions frontend data layer — endpoints, types, hooks

## What to implement
The client-side data layer for the Sessions feature, following the established feature conventions
(endpoints module, contract types, cache-key + freshness config, TanStack Query hooks).

- Contract types: `Session`, `CreateSession`, `UpdateSession` mirroring the shapes in the
  implementation plan (mandatory `topic` and `goal`, raw `linked_story_id` / `linked_task_id`,
  `is_complete`, `archived_at`, etc.). `CreateSession` requires `topic` and `goal` and has no
  `is_complete`; `UpdateSession` carries the updatable fields including `topic` / `goal` (mandatory,
  non-clearable), `is_complete`, and the nullable-clearable link ids.
- Endpoint functions for the five REST operations: create, project-scoped list
  (`project_id` required; `incomplete` / `linked_story_id` / `include_archived` / pagination params),
  get by id, update, archive. The list returns the full list envelope for pagination metadata.
- Cache-key registry entries and per-domain freshness config for sessions.
- Hooks: session list (project-scoped, with the incomplete / linked-story filters), single session
  detail, and create / update / archive mutations. Mutations invalidate the project's session list and
  the affected session's detail.

No business logic on the client — validation and dictionary rules are server-side; the participant-role
dropdown is populated from the project's effective settings (existing effective-settings query).

## Scope
`frontend/src/features/sessions/` (endpoints, hooks), `frontend/src/api/` (types, paths), and the client
cache/config registries.

## Dependencies
TASK-003

## Acceptance Criteria
- [ ] `Session` / `CreateSession` / `UpdateSession` types match the contract shapes, including the
      mandatory `topic` and `goal` fields; `CreateSession` omits `is_complete`.
- [ ] Endpoint functions cover create / list / get / update / archive; the list sends the required
      `project_id` and the optional filters.
- [ ] Hooks expose the project-scoped list (with incomplete + linked-story filters), detail, and
      create/update/archive mutations, invalidating the correct caches.

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

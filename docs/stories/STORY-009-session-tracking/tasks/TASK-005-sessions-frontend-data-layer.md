---
status: Done
assignee: frontend-developer
story: STORY-009
---

# TASK-005: Sessions frontend data layer — endpoints, types, hooks

> **Superseded in part by TASK-009 (2026-07-29):** the `Session`/`CreateSession`/`UpdateSession` contract
> types change — `status` becomes the required three-value enum, `is_complete` is removed, and
> `CreateSession` drops `status`. The endpoint functions, cache keys, and hooks are otherwise unchanged.
> This task's report stays as the record of the original build.

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
**Date**: 2026-07-29
**What was done**: Built the Sessions client data layer end-to-end against the live `/v1/sessions`
REST API (backend TASK-001/002/003, already Done): rewrote the stale v1.0-forward-spec `Session` /
`CreateSession` / `UpdateSession` types in `src/api/types.ts` to match the as-built backend schema
(`project_id`, `goal`, `is_complete`, required `participant_role`, nullable-clearable vs.
non-clearable fields); added `SESSIONS` / `SESSION` / `SESSION_ARCHIVE` path constants to
`src/api/paths.ts`; added `src/api/endpoints/sessions.ts` (createSession, listSessions,
getSession, updateSession, archiveSession — list requires `project_id` and accepts
`incomplete`/`linked_story_id`/`include_archived`, returns the full `ListEnvelope`); added
`src/features/sessions/hooks/useSessions.ts` (`useSessionList`, `useSession`, `useCreateSession`,
`useUpdateSession`, `useArchiveSession`); reshaped the pre-existing `CACHE_KEYS.sessions.list` key
to take a required `projectId` (was a flat placeholder key with no project scope) and added
`PAGINATION.SESSIONS` / `DATA_FRESHNESS.SESSIONS` to the config registries.
**Deviations from plan**: None — implemented exactly per the task file and implementation_plan.md.
The task's "Scope" line lists endpoint functions under `frontend/src/features/sessions/`, but they
were placed at the established convention path `src/api/endpoints/sessions.ts` (matching every other
domain's endpoints module) — a wording-vs-established-convention resolution, not a scope change.
**Technical decisions made**: Mutation hooks (`useCreateSession`/`useUpdateSession`/
`useArchiveSession`) take `projectId` as a hook parameter and scope their cache invalidation to that
project's session list, mirroring the existing story-scoped Tasks hooks (`useUpdateTask(storyId)`)
rather than the broader "invalidate everything" pattern some earlier domains (Milestones) use — sessions
have no cross-project list, so a project-scoped invalidation is both correct and more precise.
**Code locations**: `frontend/src/api/types.ts` (Session/CreateSession/UpdateSession),
`frontend/src/api/paths.ts` (SESSIONS/SESSION/SESSION_ARCHIVE),
`frontend/src/api/endpoints/sessions.ts`, `frontend/src/features/sessions/hooks/useSessions.ts`,
`frontend/src/config/cacheConfig.ts` (sessions.list reshaped), `frontend/src/config/apiConfig.ts`
(PAGINATION.SESSIONS, DATA_FRESHNESS.SESSIONS).
**Technical debt noted**: None. Verified against the live backend schema/controller
(`backend/app/sessions/schema.py`, `controller.py`) rather than the locked v1.0 `docs/api-contract.md`
`## Sessions` block, which is confirmed stale per the story description and implementation plan — to
be reconciled to v1.8 at story Reconcile. No participant-role dropdown logic here (data-layer only,
per TASK-006's scope) — the effective-settings query it will consume already exists.

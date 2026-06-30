---
status: ToDo
assignee: frontend-developer
story: STORY-003
---

# TASK-005: Project Management screen

## What to implement

Replace the existing Projects placeholder screen with a working Project Management screen
that lets the user create, view, list, edit, and delete projects through the locked REST
API.

Behaviors:
- **List** — show all projects paginated (page/limit), using the standard list response.
  Render an empty-state when there are no projects (the API returns an empty list, not an
  error).
- **Create** — a form capturing `name` (required, 1–200) and optional `description`
  (max 5000). On success the list refreshes.
- **Edit** — update an existing project's `name` and/or `description`.
- **Delete** — delete with a confirmation step that makes clear all nested data (stories,
  tasks, attachments, comments, settings overrides) will be permanently removed.
- **Conflict handling** — when create or edit returns the 409 conflict, surface the API's
  message ("A project with this name already exists.") inline to the user.

Wire all calls through TanStack Query hooks in the projects API module. The list hook
already exists from STORY-002; this task adds the create/update/delete mutations with
appropriate query-cache invalidation. Reuse the existing API client wrapper and the
contract-derived `Project` types — do not redefine API types and do not modify the contract.

## Scope

`frontend/src/screens/projects/` (the screen) and `frontend/src/api/projects.ts` (CRUD
mutation hooks). Uses the existing API client, query-key factory, and shared UI components.

## Dependencies

TASK-003.

## Acceptance Criteria

- [ ] The Projects route renders the real management screen, not the placeholder.
- [ ] Projects can be created, listed (paginated), edited, and deleted from the UI.
- [ ] The empty system shows an empty-state, not an error.
- [ ] Delete requires explicit confirmation and communicates that nested data is removed.
- [ ] A duplicate name on create or edit shows the API conflict message inline.
- [ ] All requests go through TanStack Query hooks with correct cache invalidation; API
      types come from the existing contract-derived types.

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

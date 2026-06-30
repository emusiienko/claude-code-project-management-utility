---
status: ToDo
assignee: backend-developer
story: STORY-003
---

# TASK-002: Project service

## What to implement

Implement the project service — the single home for all project business rules, shared by
both the REST controller and the MCP tools. Neither surface may hold logic; both call this
service.

Operations and rules:
- **Create** — validate `name` (required, 1–200 chars) and `description` (optional, max
  5000). Enforce case-insensitive name uniqueness; on collision raise the domain conflict
  error with the exact message "A project with this name already exists." (code `CONFLICT`).
  Set `created_at`/`updated_at`. Return the created project.
- **Get by id** — return the project, or raise the domain not-found error if absent.
- **List** — paginated (page default 1; limit default 20, max 100). Return items plus the
  total count for the standard list envelope's `meta`. An empty system returns an empty
  list, never an error.
- **Update** — partial update of `name` and/or `description` with the same validation as
  create. Re-check case-insensitive uniqueness against *other* projects when `name` changes;
  on collision raise the same conflict error. Touch `updated_at`. Raise not-found if the
  project does not exist.
- **Delete** — remove the project; rely on the database `ON DELETE CASCADE` chain to remove
  all nested data (stories → tasks → attachments/versions/comments/links, and
  project_settings) atomically so no partial state remains. Raise not-found if absent.

All error conditions use the existing domain error classes and centralized error codes so
the shared error handler maps them consistently for REST (409/404/400) and MCP.

## Scope

`backend/app/projects/` (service). Uses the repository from TASK-001 and the core domain
error classes.

## Dependencies

TASK-001.

## Acceptance Criteria

- [ ] Create rejects an empty name, a name over 200 chars, and a description over 5000 chars
      with a validation error.
- [ ] Create and update raise the conflict error with the verbatim message on a
      case-insensitive name collision; update does not collide a project with itself.
- [ ] Get and update on a missing id raise the not-found error.
- [ ] List is paginated, honors limit max 100, and returns an empty list on an empty system.
- [ ] Delete removes the project and all nested data in one operation (verified via cascade)
      and raises not-found on a missing id.
- [ ] No business logic lives outside the service.

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
---
status: ToDo
assignee: qa-automation
story: STORY-003
---

# TASK-006: Write automated tests

## What to implement

Write automated tests covering the project domain across the service layer and both
surfaces (REST and MCP), run against the running application.

**Endpoints / operations (REST + MCP mirror):**
- `POST /projects` / `create_project` — happy path (201/created); validation error on empty
  name, name > 200, description > 5000 (400 / `VALIDATION_ERROR`); duplicate name (409 /
  `CONFLICT`).
- `GET /projects` / `list_projects` — populated list with correct `meta` (total, page,
  limit, totalPages); pagination (page/limit, limit capped at 100); empty system returns an
  empty list, not an error.
- `GET /projects/:id` / `get_project` — found; not found (404 / `NOT_FOUND`).
- `PUT /projects/:id` / `update_project` — happy path; partial update (name only,
  description only); not found (404); duplicate name against another project (409); updating
  a project to its own current name is allowed.
- `DELETE /projects/:id` / `delete_project` — happy path (204 / success); not found (404).

**Behaviors:**
- Name uniqueness is case-insensitive — "Alpha" and "alpha" collide on both create and
  update.
- The 409 body/error carries the verbatim message "A project with this name already
  exists." with code `CONFLICT`.
- REST and MCP are behavior-identical for equivalent inputs.

**Edge cases:**
- Deleting a project with nested data (at least a project_settings override; stories/tasks
  if those fixtures are available) removes all nested rows in one operation — verify no
  orphan/partial state remains after delete.
- Listing on an empty system returns an empty list with `total: 0`.
- Updating a name to a name used by another project is rejected; updating to its own name
  is not.

## Scope

The project domain — service layer plus REST and MCP surfaces. Tests run against the running
application per the qa-automation strategy.

## Dependencies

TASK-003, TASK-004, TASK-005 (implementation must be complete before tests can run green).

## Acceptance Criteria

- [ ] All listed endpoints/operations and behaviors have at least one test on both surfaces.
- [ ] Case-insensitive uniqueness (create + update) and the verbatim conflict message are
      covered.
- [ ] Cascade delete is verified to leave no nested project_settings (and stories/tasks if
      available) rows.
- [ ] Empty-list behavior is covered.
- [ ] Tests pass against the running application.

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

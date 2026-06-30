---
status: ToDo
assignee: backend-developer
story: STORY-003
---

# TASK-003: Project REST controller

## What to implement

Expose the five locked project endpoints over REST, following the settings controller
pattern (a router plus a FastAPI dependency that injects the project service). The
controller is thin: it validates/deserializes input, delegates to the project service, and
shapes responses. No business rules here.

Endpoints (all under the `/v1` API root, exactly as in the LOCKED v1.0 contract):
- `POST /projects` → 201 `Envelope<Project>` (errors 400, 409, 500)
- `GET /projects?page&limit` → 200 `ListEnvelope<Project>`
- `GET /projects/:id` → 200 `Envelope<Project>` (404)
- `PUT /projects/:id` → 200 `Envelope<Project>` (400, 404, 409)
- `DELETE /projects/:id` → 204, no body (404)

Request/response schemas are Pydantic models mirroring the contract exactly:
`CreateProjectBody { name; description? }`, `UpdateProjectBody { name?; description? }`, and
a `Project` response shape (`id`, `name`, `description | null`, `created_at`, `updated_at`),
wrapped in the standard `Envelope` / `ListEnvelope` shapes. The list response `meta` carries
`total`, `page`, `limit`, `totalPages`. Domain errors raised by the service are translated
to HTTP status by the existing centralized error handler — including the verbatim 409
conflict message. Register the router on the REST app factory.

## Scope

`backend/app/projects/` (schemas, dependencies, controller) and the REST app router
registration.

## Dependencies

TASK-002.

## Acceptance Criteria

- [ ] All five endpoints are mounted under `/v1` and match the locked contract's methods,
      paths, bodies, and status codes (201/200/200/200/204).
- [ ] Responses use the standard `Envelope` / `ListEnvelope` shapes; the list `meta`
      includes `total`, `page`, `limit`, `totalPages`.
- [ ] A duplicate name on create or update returns 409 with body
      `{ "error": "A project with this name already exists.", "code": "CONFLICT" }`.
- [ ] Get/update/delete on a missing id return 404; invalid bodies return 400.
- [ ] The controller contains no business rules — it only delegates to the service.

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

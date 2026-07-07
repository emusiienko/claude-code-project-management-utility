---
status: Done
assignee: backend-developer
story: STORY-004
---

# TASK-003: Story REST controller, MCP tools & DI wiring

## What to implement
Expose the story service over both access surfaces and wire it into the composition root, mirroring
the `projects` domain.

**REST controller** (thin — no logic, delegates to the service):
- `POST /projects/:projectId/stories` → create (project must exist; status validated).
- `GET /projects/:projectId/stories` with `page`, `limit`, `status`, `label_key`, `label_value`
  query parameters → paginated, filtered list.
- `GET /stories/:id` → single story.
- `PUT /stories/:id` → update (title/content/status/labels; labels replace when provided).
- `DELETE /stories/:id` → hard delete.

**MCP tools** — five tools mirroring the REST surface exactly, behavior-identical, each a thin
wrapper over the same service. No logic in either entry layer.

**DI wiring** — register the story repository and service in the container, and register the story
REST router and MCP tool module in the application composition, following the existing settings and
projects wiring pattern.

**Out of scope:** `GET /stories/:id/aggregate` is defined in the contract but derives per-status
counts from tasks, which do not exist until STORY-005. Do not implement it in this story.

The API contract is LOCKED and already covers these endpoints — make no contract change. If
implementation reveals a genuine gap, stop and raise it rather than editing the contract.

## Scope
`backend/app/stories/` (controller, MCP tools), `backend/app/container/`, application composition
(router + tool registration).

## Dependencies
TASK-002

## Acceptance Criteria
- [ ] All five REST routes are registered under the contract paths and delegate to the service.
- [ ] Five MCP tools mirror the REST surface and are behavior-identical.
- [ ] Story repository and service are registered in the DI container.
- [ ] Router and MCP tool module are registered in the application composition.
- [ ] `GET /stories/:id/aggregate` is not implemented.
- [ ] No changes to `docs/api-contract.md`.
- [ ] Both surfaces return identical results for equivalent inputs, including error shapes.

## Intended ADR
None.

---
## Implementation Report

**Date**: 2026-07-07

**What was done**:
- Created `backend/app/stories/controller.py` with five REST route handlers across two routers: `router` (POST + GET list under the `/projects` prefix) and `stories_router` (GET/PUT/DELETE by story id under the `/stories` prefix). All handlers are thin — they parse input, call the service, and return the response envelope.
- Created `backend/app/stories/mcp_tools.py` with five MCP tools (`create_story`, `list_stories`, `get_story`, `update_story`, `delete_story`) mirroring the REST surface exactly, all delegating to `StoryService` and translating `DomainError` to `ToolError`.
- Added `story_repository` and `story_service` Factory providers to `AppContainer` in `backend/app/container/container.py`. `story_service` receives `repo`, `project_repo`, and `effective_dict` (the `settings_service` provider, which satisfies the `EffectiveDictionary` Protocol).
- Added `provide_story_service` async context manager to `backend/app/container/mcp_dependencies.py`, following the same `@asynccontextmanager` + `@inject` + `Closing[Provide[]]` pattern as existing providers.
- Added `STORIES` to the `AppPath` enum in `backend/app/api/routes.py`.
- Updated `backend/app/api/router.py` to include both story routers under their respective path prefixes (`/projects` and `/stories`).
- Updated `container.wire()` in `backend/app/main.py` to include `app.stories`.

**Deviations from plan**:
- The implementation plan mentions five routes but the REST routes split across two URL structures (`/projects/:id/stories` and `/stories/:id`). The controller uses two separate `APIRouter` instances (`router` and `stories_router`) rather than one, which is necessary because FastAPI routers have a single path prefix. Both are registered in `api/router.py`. This is a structural necessity, not a functional deviation.
- `GET /stories/:id/aggregate` is not implemented, as required — the task spec explicitly calls this out of scope until STORY-005.

**Technical decisions made**:
- For `PUT /stories/:id` and `DELETE /stories/:id` (routes without `project_id` in the path), the controller calls `service.get_by_id(story_id)` first to retrieve `project_id`, then calls `service.update()` / `service.delete()` with that value. This avoids adding new service methods and keeps the controller thin. The double read is acceptable — it is a single transaction and the extra DB hit is negligible for this use case. The MCP tools follow the same pattern.
- `story_service` in the DI container is wired with `effective_dict=settings_service` rather than a new provider, because `SettingsService` already satisfies the `EffectiveDictionary` Protocol. No new interface binding is needed.

**Code locations**:
- `backend/app/stories/controller.py` — REST controller (two routers)
- `backend/app/stories/mcp_tools.py` — MCP tools
- `backend/app/container/container.py` — `story_repository` + `story_service` providers
- `backend/app/container/mcp_dependencies.py` — `provide_story_service`
- `backend/app/api/routes.py` — `AppPath.STORIES` added
- `backend/app/api/router.py` — both story routers registered
- `backend/app/main.py` — `app.stories` added to `container.wire()`

**Technical debt noted**:
- None.

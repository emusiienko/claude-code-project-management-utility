---
status: Done
assignee: backend-developer
story: STORY-006
---

# TASK-002: story_links backend domain

## What to implement

A new `story_links` domain package with the same structure, validation, and enrichment shape as `task_links` (TASK-001), scoped to stories within the **same project**. A story link is a directed row between two stories: a source story, a target story, and a `link_type`. It is a separate package from `task_links` — the two are not generalized into one polymorphic table.

**Create operation** — enforces the five validation rules in the service, in this precedence order:

1. Both source and target stories exist (missing story → 404).
2. Same-project scope: both stories share the same `project_id` (mismatch → 422, message: "Cannot link stories from different projects.").
3. No self-link: source and target are not the same story (→ 422, message: "A story cannot link to itself.").
4. `link_type` is present in the owning project's effective `link_types` dictionary. Resolve the project directly from the story and validate against the effective dictionary using the effective-dictionary resolution already injected into the stories service (→ 422 for a value outside the dictionary).
5. No duplicate: a link with the same source story, target story, and `link_type` must not already exist (→ 409, message: "This link already exists.").

Field-shape validation stays in the input schema (422 via request validation); ID coercion stays in the base repository.

**List operation** — returns enriched links for a given story. Each row carries a `direction` marker (`outbound` when the viewed story is the source, `inbound` when it is the target) and a linked-story summary (`id`, `title`, `status`). Supports a `direction` filter (`outbound` | `inbound` | `both`, default `both`), a `link_type` filter, and standard pagination. Enrichment must be batched — one query per direction over the counterpart id set, read directly through this domain's repository session against the story table; no call into the stories service, no per-row lookup.

**Delete operation** — deletes a story link by its own id.

**Repository** — expose the batch enrichment read and a "delete all links referencing a given story id" (either side) operation for TASK-003.

**Wiring** — register the service provider on the DI container, add the controller's routers to the app router, register the MCP tools, and add the new package to the container wiring package list. The story-link service provider must be declared before the stories service provider that will receive it in TASK-003.

**Endpoints:**
- `POST /stories/:storyId/links` — create a link from the path story to a target story.
- `GET /stories/:storyId/links` — list enriched links for the path story (`direction`, `link_type`, pagination).
- `DELETE /story-links/:id` — delete a link by its own id. `story-links` is a new top-level path.

**MCP tools** — mirror the three REST operations exactly, sharing the same service methods.

## Scope

New `backend/app/story_links/` domain package; DI container; app router; MCP tool registration; container wiring package list.

## Dependencies

TASK-001 — for the settled shared validation/enrichment shape to mirror. No runtime dependency between the two packages; may proceed in parallel once TASK-001's shape is fixed.

## Acceptance Criteria

- [ ] A directed typed link can be created between two stories in the same project via `POST /stories/:storyId/links`.
- [ ] Creating a link with a `link_type` not in the project's effective `link_types` is rejected (422).
- [ ] Linking a story to itself is rejected (422, "A story cannot link to itself.").
- [ ] Linking stories from different projects is rejected (422, "Cannot link stories from different projects.").
- [ ] A duplicate link (same source, target, and type) is rejected (409, "This link already exists.").
- [ ] A missing source or target story yields 404, checked before scope/self/dictionary and before duplicate.
- [ ] `GET /stories/:storyId/links` returns enriched links with `direction` and a linked-story summary (`id`, `title`, `status`), honoring the `direction` (default `both`) and `link_type` filters and pagination; enrichment issues no per-row query.
- [ ] `DELETE /story-links/:id` removes a link by its own id.
- [ ] The repository exposes a "delete all links referencing a story id" method (either side) for TASK-003.
- [ ] REST and MCP surfaces are behavior-identical, both delegating to the same service.

## Intended ADR

Same as TASK-001 — recorded once at Reconcile for both link domains.

---
## Implementation Report

**Date**: 2026-07-12

**What was done**:
New `backend/app/story_links/` domain package created with the full vertical slice: model, repository, service, schema, controller, and MCP tools. The package is wired into the DI container, the app router, the MCP server, and the Alembic migration chain. All five validation rules are enforced in the service in the correct precedence order (404 → 422/scope → 422/self → 422/dict → 409/dup). Enrichment is batched (one query per direction over the counterpart ID set). The repository exposes `delete_all_for_story` and `list_all_for_story` for TASK-003.

**Deviations from plan**:
None. Implementation mirrors `task_links` (TASK-001) exactly, with the scope constraint changed from `story_id` to `project_id` as specified.

**Technical decisions made**:
- Used `source_story.project_id` directly (available from the ORM row already loaded for rule 1) to resolve the project for the dictionary validation — no extra query needed, unlike `task_links` which required `task → story → project` traversal.
- The `story_link_service` provider is declared in the container after `story_repository` and `settings_service` (its dependencies) but before `task_service`; this satisfies the ordering constraint noted in the implementation plan for the future TASK-003 Protocol injection.

**Code locations**:
- `backend/app/story_links/` — model, repository, service, schema, controller, mcp_tools, __init__
- `backend/migrations/versions/0007_story_link.py` — Alembic migration creating `story_link` table with FKs, uniqueness constraint, and two directional indexes
- `backend/app/container/container.py` — `story_link_repository` and `story_link_service` providers
- `backend/app/container/mcp_dependencies.py` — `provide_story_link_service` bridge
- `backend/app/api/routes.py` — `AppPath.STORY_LINKS = "story-links"`
- `backend/app/api/router.py` — two new `include_router` calls (stories prefix + top-level story-links prefix)
- `backend/app/main.py` — `"app.story_links"` added to `container.wire(packages=[...])`
- `backend/migrations/env.py` — `StoryLink` model import registered

**Technical debt noted**:
None.

---
status: Done
assignee: backend-developer
story: STORY-002
---

# TASK-004: Settings REST controller

## What to implement
Expose exactly the Settings endpoints from the LOCKED v1.0 contract, wired through the container to
the Settings service, returning the standard `{ data, error }` envelopes and mapping domain errors to
the contract's status codes.

Endpoints (verbatim from the contract):
- `GET  /system/settings` → `Envelope<Settings>`
- `PUT  /system/settings` → `Envelope<Settings>` | `400` (unknown key; empty values). Body is
  `Partial<Settings>` — only provided keys updated.
- `GET  /projects/:projectId/settings` → `Envelope<SettingsOverrides>` (`{}` if none) | `404`
- `GET  /projects/:projectId/settings/effective` → `Envelope<Settings>` | `404`
- `PUT  /projects/:projectId/settings` → `Envelope<Settings>` (effective after update) | `400`, `404`.
  Body `Partial<Settings>`; an override fully replaces the system default for that key.

No business logic in the controller — it delegates to the service. Clearing a single override is
expressed within the project-settings `PUT` semantics as defined by the contract.

## Scope
`backend/app/settings/` (REST controller) + its registration in `api`/`container`.

## Dependencies
TASK-003

## Acceptance Criteria
- [ ] All five contract operations are reachable under `/v1` with the exact methods/paths above.
- [ ] `GET /projects/:id/settings` returns only stored overrides (`{}` when none).
- [ ] `PUT /projects/:id/settings` returns the **effective** settings after the update.
- [ ] Unknown key / empty values → `400`; missing project → `404`; payloads match the contract shapes.
- [ ] Controller contains no business logic — all rules come from the service.

## Intended ADR
None.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
Created `backend/app/settings/schema.py` with `UpdateSettingsBody` (partial request), `SettingsResponse` (all six keys), and `SettingsOverridesResponse` (nullable fields, used with `exclude_none=True` to produce `{}` when no overrides exist). Created `backend/app/settings/dependencies.py` with `_get_db` (generator dependency: commits on success, rolls back on exception, closes always) and `get_settings_service` (builds all three dependencies sharing the same `Session`). Created `backend/app/settings/controller.py` with five route handlers — all thin: parse body → call service → return `{ "data": ... }` envelope. Added `get_effective_settings` method to `SettingsService` (public entry point that asserts project existence then calls `resolve_all`). Updated `backend/app/api/factory.py` to import and register `settings_router` under the `/v1` prefix.

**Deviations from plan**:
The plan's critical note warned against calling `container.settings_service()` directly (three independent sessions). Instead of using the `dependency_injector` wiring (`@inject` + `Provide`), the controller uses a plain FastAPI `Depends` chain: `_get_db` yields one shared session from `container.session_factory()`, and `get_settings_service` builds all three dependencies (system_repo, project_repo, project_checker) from that session. This is intentional and correct — it avoids the multi-session atomicity problem.

Added a `get_effective_settings` method to `SettingsService` (not in original service plan) to provide a clean public entry point for the effective-settings GET that validates project existence. This is a minimal, non-breaking addition to the service and keeps the controller logic-free.

**Technical decisions made**:
- Session lifecycle (`commit`/`rollback`/`close`) is managed in the `_get_db` generator dependency, not in individual route handlers — this is the correct FastAPI pattern and keeps controllers clean.
- `UpdateSettingsBody.to_key_value_pairs()` iterates keys in constant order (matching `ALL_DICT_KEYS` order) so multi-key updates are deterministic.
- `SettingsOverridesResponse.model_dump(exclude_none=True)` produces `{}` when no overrides exist, matching the contract shape `SettingsOverrides = Partial<Record<DictionaryKey, string[]>>`.
- `dependencies.py` lives in `app/settings/` (not in `container/`) because it is a FastAPI-specific composition helper for this domain's HTTP surface, not a DI provider definition. The `container/` package remains the sole DI composition root for `dependency_injector` providers.

**Code locations**:
- `backend/app/settings/schema.py` — Pydantic request/response schemas
- `backend/app/settings/dependencies.py` — `_get_db` + `get_settings_service` FastAPI dependencies
- `backend/app/settings/controller.py` — 5 route handlers, `APIRouter`
- `backend/app/settings/service.py` — added `get_effective_settings` method
- `backend/app/api/factory.py` — `_register_routers` updated to include `settings_router`

**Technical debt noted**:
None.

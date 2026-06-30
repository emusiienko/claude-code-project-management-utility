---
status: Done
assignee: backend-developer
story: STORY-002
---

# TASK-003: Settings service & effective resolution

## What to implement
The Settings service — the single home of all Settings business rules, called identically by REST and
MCP. Implements the effective-dictionary resolver whose signature was introduced in core.

Rules:
- **Key validation** — only the six known dictionary keys are accepted; any other key in a write body
  is `400 VALIDATION_ERROR`.
- **Non-empty rule** — an empty list for any key is rejected with `400` and the exact message
  "Dictionary values cannot be empty." (verbatim).
- **Value-list normalization** — values stored as provided after shape validation (non-empty
  strings); duplicate/whitespace handling is a service concern, identical for system and project
  writes.
- **Override semantics** — a project override for a key **fully replaces** the system default for
  that key (replace, never merge). Setting an override for one key must not touch other keys.
- **Clear-one-key** — expose a clear operation that removes one project key's override and leaves the
  others untouched; clearing restores the system default for that key only.
- **Project existence** — every project-scoped read or write first asserts the project exists; a
  missing project is `404 NOT_FOUND`.
- **Cross-project isolation** — a write to one project's overrides, or to system settings, must never
  change another project's *stored* overrides.
- **Effective resolution** — derived on demand, never stored: for each of the six keys, take the
  project override if a row exists, otherwise the system default.

## Scope
`backend/app/settings/` (service + effective-resolution implementation).

## Dependencies
TASK-002

## Acceptance Criteria
- [ ] Unknown settings key in a write body → `400 VALIDATION_ERROR`.
- [ ] Empty list for any key → `400` with the verbatim message "Dictionary values cannot be empty."
- [ ] Setting an override for one key replaces only that key's effective value; other keys unchanged.
- [ ] Clearing one key's override restores its system default and leaves other overrides intact.
- [ ] Effective settings = override-if-present else system-default, for all six keys, derived not
      stored.
- [ ] Project-scoped operations on a missing project → `404 NOT_FOUND`.
- [ ] A write to one project's overrides leaves every other project's stored overrides unchanged.
- [ ] All rules live in the service; no business logic in controllers or MCP tools.

## Intended ADR
Effective-settings resolution model (override fully replaces, never merges; derived, never stored) —
recorded in the plan; created at Reconcile if confirmed.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
Implemented `backend/app/settings/service.py` — the `SettingsService` class with all Settings
business rules and the `ProjectChecker` Protocol. Also created
`backend/app/container/project_checker.py` with the `SqlProjectChecker` concrete implementation
used until the project domain exists. Updated `backend/app/container/container.py` to register
all Settings domain providers (repositories, checker, service) and added `db_session` Factory
provider. Added `create_session` helper to `backend/app/core/database/session.py` for the DI
container session pattern.

**Deviations from plan**:
None. All eight acceptance criteria are met exactly as specified.

**Technical decisions made**:

1. **`ProjectChecker` Protocol in `service.py`**: the service defines its own `ProjectChecker`
   Protocol (structural typing) so it has zero import-time dependency on the project domain. The
   concrete `SqlProjectChecker` lives in `container/` — the only package permitted to cross domain
   boundaries — and uses a dialect-neutral `text()` SELECT EXISTS query.

2. **`SettingsService` has no `session` parameter**: the session is fully mediated through the
   injected repositories. The controller (TASK-004) holds the session lifecycle and commits or
   rolls back; the service only flushes via the repositories. This keeps the service layer pure.

3. **`db_session` Factory provider in container**: a `create_session` helper was added to
   `core/database/session.py` so the DI container can produce a `Session` instance per `Factory`
   resolution. Important caveat for TASK-004: all three repository + checker `Factory` providers
   resolve independently via `dependency_injector`, meaning they each get a *different* `Session`
   instance when the container resolves `settings_service`. The controller must construct the
   service with shared-session instances obtained from a single FastAPI `Depends(get_db)` call —
   not via the container's `settings_service` Factory directly. The container providers serve as
   type-correct templates and for documentation purposes; the controller wires the shared session
   manually.

4. **`clear_project_setting` is a no-op for absent overrides**: clearing a key that has no
   override row is intentionally silent — the effective value is already the system default. The
   method returns the full effective settings after the (no-op) operation.

5. **`_EMPTY_VALUES_MSG` constant**: the verbatim error message "Dictionary values cannot be
   empty." is defined as a module-level constant (single source of truth), not duplicated inline.

**Code locations**:
- `backend/app/settings/service.py` — `ProjectChecker` Protocol + `SettingsService`
- `backend/app/container/project_checker.py` — `SqlProjectChecker` concrete implementation
- `backend/app/container/container.py` — `db_session`, `system_settings_repository`,
  `project_settings_repository`, `project_checker`, `settings_service` providers added
- `backend/app/core/database/session.py` — `create_session` helper added
- `backend/app/core/database/__init__.py` — `create_session` added to `__all__`

**Technical debt noted**:
- The container's `db_session` Factory creates a separate Session per dependency in a single
  resolution graph (STORY-002 scope: TASK-004 addresses this when the controller is built).
  Tagged as a known issue in the Implementation Report so TASK-004 implementor is forewarned.

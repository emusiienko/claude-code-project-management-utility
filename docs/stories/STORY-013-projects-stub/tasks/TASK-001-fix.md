---
status: Done
assignee: backend-developer
story: STORY-013
---

# TASK-001: Add GET /v1/projects stub

## What to implement
Add a `controller.py` to `backend/app/projects/` with a single `GET /projects` route handler.
The handler accepts `page` and `limit` query params and returns a hardcoded empty
`ListEnvelope<Project>` response (no DB interaction, no service, no repository).

Wire the router into the FastAPI app factory in `backend/app/api/factory.py`.

## Scope
- `backend/app/projects/controller.py` — new file
- `backend/app/api/factory.py` — register the projects router

## Dependencies
None

## Acceptance Criteria
- [ ] `GET /v1/projects` returns 200 with `{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }`
- [ ] `?limit=100` echoes `limit: 100` in the meta
- [ ] `?page=2` echoes `page: 2` in the meta
- [ ] No DB, no service, no repository
- [ ] No regressions in the test suite

## Intended ADR
None — this is a temporary stub; full implementation lands in STORY-003.

---
## Implementation Report
**Date**: 2026-06-30
**What was done**: Added `backend/app/projects/controller.py` with a single `GET /projects`
route handler that returns a hardcoded empty `ListEnvelope<Project>` response. Registered the
router in `backend/app/api/factory.py`. Verified all acceptance criteria with Starlette
`TestClient`. Test suite: 36 failed / 5 passed before and after — no regressions introduced.
Pre-existing failures are all in `test_settings.py` (Alembic path issue when run from project
root; they pass when run from `backend/`).

**Deviations from plan**: None.

**Technical decisions made**:
- `page` and `limit` query params are accepted and echoed in `meta` to match the `ListEnvelope`
  shape exactly — even though the stub always returns zero items. This prevents frontend
  validation errors on the meta object.
- `limit` capped at 100 (max per API contract); default 20 (API contract default).
- No schema file created — the inline `dict` return is sufficient for a temporary stub that
  will be deleted wholesale when STORY-003 lands.

**Code locations**:
- `backend/app/projects/controller.py` — new stub controller
- `backend/app/api/factory.py` — added projects router registration

**Technical debt noted**: This stub must be deleted and replaced by the full STORY-003
implementation. The `TODO(STORY-003)` comment in `controller.py` marks the replacement point.

---
status: Accepted
type: fix
priority: P0
date: 2026-06-30
---

# STORY-013: Projects List Stub

## Desired Outcome
`GET /v1/projects` returns HTTP 200 with a valid empty `ListEnvelope<Project>` so the frontend
Settings screen can load without error while STORY-003 (Project Management) is still in progress.

## Context
The frontend Settings screen has a "Project Overrides" tab that calls `GET /v1/projects?limit=100`
to populate a project selector. STORY-003 will implement the full Projects domain, but is not yet
complete. Until then, the missing endpoint causes a 404, breaking the Settings screen for QA.

This fix adds a minimal stub: a single route handler that returns a hardcoded empty paginated
response. No service layer, no repository call, no DB query. The stub lives in
`backend/app/projects/` and is wired into the FastAPI app. It will be replaced wholesale when
STORY-003 lands.

## Acceptance Criteria
- [ ] `GET /v1/projects` returns HTTP 200
- [ ] Response body matches `ListEnvelope<Project>`: `{ data: [], meta: { total: 0, page: 1, limit: <requested>, totalPages: 0 } }`
- [ ] `limit` query param is accepted (default 20, max 100) and echoed in `meta.limit`
- [ ] `page` query param is accepted (default 1) and echoed in `meta.page`
- [ ] No service layer, repository, or DB interaction introduced
- [ ] Existing tests are not regressed

## Edge Cases & Error Scenarios
- [ ] No edge cases — stub always returns the same empty structure regardless of query params

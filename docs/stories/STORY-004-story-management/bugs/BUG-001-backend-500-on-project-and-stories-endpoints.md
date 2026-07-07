---
id: BUG-001
story: STORY-004
severity: critical
status: resolved
assignee: backend-developer
---

# BUG-001: Backend returns 500 Internal Server Error for all project-scoped endpoints when PostgreSQL is active

## Description

All project-scoped endpoints — `GET /v1/projects/:id`, `GET /v1/projects/:id/stories`, and `GET /v1/projects/:id/settings/effective` — return HTTP 500 Internal Server Error when the stack is running with PostgreSQL. This prevents the Stories screen from loading entirely: the project name does not appear in the heading, the stories table never renders, and an error banner is shown instead.

The root cause visible in the backend logs is a PostgreSQL type mismatch: the `project.id` column is stored as `character varying` in the database but SQLAlchemy is attempting to compare it using the `uuid` type (`$1::UUID`), which PostgreSQL rejects with:

```
operator does not exist: character varying = uuid
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
```

This error occurs on every query that filters by `project.id`, which affects all three endpoints above.

## Steps to Reproduce

1. Start the stack with PostgreSQL active (`docker compose up` after a `deploy.sh rebuild`)
2. Open the browser at `http://localhost:3000`
3. Click on any project name in the Projects list
4. Observe the Stories screen

## Expected Result

The Stories screen loads successfully:
- The page heading shows the project name
- The stories table renders (or the empty state if the project has no stories)
- No error banner is displayed

## Actual Result

- The page heading shows the fallback text "Project" (the project name is not loaded)
- An error banner appears: "Failed to load stories: An unexpected error occurred. Please try again."
- The browser console shows CORS errors because the backend's 500 responses do not include the `Access-Control-Allow-Origin` header
- Backend logs show: `sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedFunction) operator does not exist: character varying = uuid`

## Additional Info

Backend log excerpt (from `docker logs claude-code-project-management-backend-1`):

```
sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedFunction) operator does not exist: character varying = uuid
LINE 3: WHERE project.id = $1::UUID
                         ^
HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
[SQL: SELECT project.id, project.name, project.description, project.created_at, project.updated_at 
FROM project 
WHERE project.id = %(id_1)s::UUID]
```

Screenshot of the affected screen: `docs/qa/results/story-004-stories-screen-error.png`

**Impact**: All 11 test cases for STORY-004 are blocked. The Stories screen is completely non-functional under PostgreSQL.

**Environment**: Docker stack on localhost, PostgreSQL profile active (container `claude-code-project-management-db-1` running postgres:18).

---

## Re-verification Note (2026-07-07)

Backend-developer marked this bug `fixed` (migration 0004 applied). QA re-verification on 2026-07-07 confirms the bug is **still reproducible**. Backend container logs show the identical SQLAlchemy ProgrammingError on every project-scoped GET request. Status reverted to `open`.

Updated screenshot: `docs/qa/results/story-004-stories-screen-cors-error.png`

---

## Fix Note (2026-07-07)

**Root cause confirmed**: migration 0004 was `git:untracked` and was never included in the Docker image during `./deploy.sh rebuild`. Even if it had run, it would have converted columns to native `uuid` type while `process_bind_param` continued sending `uuid.UUID` objects — correct. However, the fundamental design of `load_dialect_impl` returning `PG_UUID(as_uuid=True)` is brittle: it assumes the underlying column is already native uuid type, which was not true on the existing database.

**Fix applied**: `UUIDType.load_dialect_impl()` in `backend/app/core/database/types.py` now returns `String(36)` unconditionally for all dialects. SQLAlchemy no longer generates `::UUID` casts in any SQL, so `character varying = character varying` comparisons work on PostgreSQL. `process_bind_param` updated to always return `str` (no dialect branching). Migration 0004 deleted — no data migration needed; columns remain VARCHAR(36) on PostgreSQL, which is correct.

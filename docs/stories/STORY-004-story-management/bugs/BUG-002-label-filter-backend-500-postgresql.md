---
id: BUG-002
story: STORY-004
severity: critical
status: resolved
assignee: backend-developer
---

# BUG-002: Label key/value filter causes backend 500 on PostgreSQL

## Description

When the user types a label key in the filter bar and clicks "Apply", the Stories screen shows an error banner "Failed to load stories: An unexpected error occurred. Please try again." The backend returns HTTP 500 for the GET /v1/projects/:id/stories?label_key=... request. The 500 response does not include the CORS header, so the browser also logs a CORS policy error.

The root cause visible in the backend logs is a SQLAlchemy argument error in the PostgreSQL-specific label filter implementation:

```
sqlalchemy.exc.ArgumentError: This text() construct doesn't define a bound parameter named 'fragment'
  File "app/stories/repository.py", line 128, in _apply_label_filter_postgresql
    ).bindparams(fragment=fragment_json)
```

The `_apply_label_filter_postgresql` method calls `.bindparams(fragment=fragment_json)` but the named parameter `:fragment` is not present in the SQL text string it constructs.

## Steps to Reproduce

1. Start the stack with PostgreSQL active (`./deploy.sh up`)
2. Open http://localhost:3000
3. Navigate to any project's stories page (e.g. `/projects/02daf420-3c27-4b51-b0a0-67b65b741e9e`)
4. Ensure at least one story with a label exists (e.g. label key "env", value "production")
5. In the filter bar, type "env" in the Label key field
6. Click "Apply"

## Expected Result

- Only stories whose labels contain key "env" are shown in the table
- No error banner is displayed

## Actual Result

- An error banner appears: "Failed to load stories: An unexpected error occurred. Please try again."
- The table disappears entirely
- Browser console shows CORS errors on the /v1/projects/:id/stories?label_key=env request

## Additional Info

Backend log excerpt (from `docker logs claude-code-project-management-backend-1`):

```
  File "/app/backend/app/stories/repository.py", line 80, in _apply_label_filter
    return self._apply_label_filter_postgresql(stmt, label_key, label_value)
  File "/app/backend/app/stories/repository.py", line 128, in _apply_label_filter_postgresql
    ).bindparams(fragment=fragment_json)
sqlalchemy.exc.ArgumentError: This text() construct doesn't define a bound parameter named 'fragment'
```

curl confirmation:
```
curl "http://localhost:8000/v1/projects/02daf420-3c27-4b51-b0a0-67b65b741e9e/stories?page=1&limit=50&label_key=env"
→ HTTP 500 Internal Server Error
```

Screenshot: `docs/qa/results/bug-label-filter-error.png`

**Impact**: TC-009 (Filter bar — filter by label key and value) fails entirely. Filter by label key — the primary label search use case — is non-functional under PostgreSQL.

**Note**: The status filter (TC-008) is unaffected and passes correctly. Only label filtering is broken.

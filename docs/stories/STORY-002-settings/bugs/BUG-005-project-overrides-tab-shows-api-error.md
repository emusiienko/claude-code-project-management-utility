---
id: BUG-005
story: STORY-002
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-005: Project Overrides tab shows truncated error message when projects API is unavailable

## Description

When the user clicks the "Project Overrides" tab on `/settings`, the project list panel displays a red error box with the text "Failed to load projects:" — the message is truncated (ends with a colon, no error detail). The underlying cause is that `GET /v1/projects?limit=100` returns 404 because the projects endpoint is not yet implemented (STORY-003 is pending). However, the UI has two independent issues: (1) the error message is incomplete and shows the raw colon-terminated label with no further detail, and (2) the UI does not degrade gracefully when the projects API is unavailable.

## Steps to Reproduce

1. Navigate to `http://localhost:3000/settings`
2. Click the "Project Overrides" tab

## Expected Result

- Either: a friendly message such as "No projects found. Create a project first to configure overrides." is shown (graceful empty state)
- Or: if projects fail to load, a complete and informative error message with the error detail is shown (e.g., "Failed to load projects: 404 Not Found")
- The error box message should not end with a bare colon

## Actual Result

- A red alert box appears with only "Failed to load projects:" — no error detail is appended
- The UI has no empty-state guidance for the user

## Additional Info

Console error: `Failed to load resource: the server responded with a status of 404 (Not Found) @ http://localhost:8000/v1/projects?limit=100`

The root cause (projects API not implemented) will be resolved in STORY-003. The frontend bug here is the truncated error message display — the error string from the caught exception is not being appended to the label.

Screenshot: `docs/qa/results/tc002-project-overrides-tab-error.png`

## Resolution Note

The projects API now returns HTTP 200 with an empty list. The UI shows a graceful empty state ('No projects found'). Original symptom no longer reproducible.

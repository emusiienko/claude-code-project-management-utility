---
id: BUG-002
story: STORY-006
severity: critical
status: resolved
assignee: frontend-developer
---

# BUG-002: Task Detail Modal — Links section shows placeholder instead of functional UI

## Description

The "Links" section in the Task Detail Modal still renders the placeholder text "Task links — coming in STORY-006". The functional linking UI (link list, Add link form, Delete button per row) was never deployed to the frontend. All 9 task-link test cases (tc-001 through tc-009) are blocked by this issue.

## Steps to Reproduce

1. Navigate to http://localhost:3000
2. Open any project's Stories screen
3. Click a story row to open the Story slide-over
4. Click any task card to open the Task Detail Modal
5. Scroll to the "Links" section (visible with the heading "LINKS")

## Expected Result

- The Links section shows an empty state with an "Add link" control
- Clicking "Add link" opens a form to search for a target task and select a link type
- After adding a link, a row appears with a direction indicator (→), a link_type badge, and the linked task title as a clickable link

## Actual Result

The Links section displays only the placeholder text:
> "Task links — coming in STORY-006"

No Add link control, no link list, no functional UI is present.

## Additional Info

Screenshots: `docs/qa/results/tc-001-task-links-placeholder.png`

Backend status: The backend API endpoints for task-links (POST/GET /v1/tasks/{id}/links, DELETE /v1/task-links/{id}) return 404 — they are not registered in the router. The `GET /v1/tasks/{id}/detail` endpoint returns `links: []` (the field exists but is always empty). This may indicate the backend routes also need to be registered, but that is a separate backend issue outside this frontend bug report.

Observed at: 2026-07-12 via Playwright browser test on http://localhost:3000

---
id: BUG-007
story: STORY-016
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-007: /projects management page opens by default when projects exist

## Description

When at least one project exists, the default route should navigate into the project context (last visited or first in list), not the `/projects` management page. Currently `RootRedirect` falls back to `/projects` even when projects exist.

## Steps to Reproduce

1. Open the app in a browser — ensure at least one project exists.
2. Clear `app:last_project_id` from localStorage (simulate no remembered project).
3. Navigate to the root URL `/`.
4. Observe which screen is shown.

## Expected Result

`RootRedirect` reads the project list. If projects exist and no `last_project_id` is stored, navigate to `/projects/:firstId/stories`. The `/projects` management page is shown only when no projects exist at all.

## Actual Result

The `/projects` management page opens even though projects exist, instead of navigating into the first project's context.

## Additional Info

<!-- logs, screenshots, environment details -->

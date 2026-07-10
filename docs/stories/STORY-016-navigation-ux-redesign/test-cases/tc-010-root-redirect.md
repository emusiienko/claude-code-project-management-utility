---
id: tc-010
tags: @smoke @regression
story: STORY-016
status: Active
---

# tc-010: / redirect — to last project or /projects

## Preconditions
App is running.

## Steps
1. Navigate to a project's stories page (/projects/:id/stories) to set the last project in localStorage.
2. Navigate to http://localhost:3000/.
3. Verify the page redirects to /projects/:id/stories (last visited project).
4. Clear localStorage key "app:last_project_id".
5. Navigate to http://localhost:3000/.
6. Verify the page redirects to /projects.

## Expected Result
- / redirects to /projects/:lastId/stories when a last-visited project is stored in localStorage.
- / redirects to /projects when no last-visited project is stored.

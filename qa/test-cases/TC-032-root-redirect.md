---
id: TC-032
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-032: / redirect — to last project, or fallback project when none is stored

> Updated 2026-07-22 (STORY-022 reconcile): the `/projects` route no longer exists, so `/` can no longer redirect to it. When no last-visited project is stored, `/` now falls back to a project's Stories view instead (the first project in the list). Project management itself is reached only via the global "Projects" overlay entry, not via a `/` redirect. (Per STORY-022's edge cases, on a fresh install with zero projects the app instead lands on an empty Task Manager main view with the Projects overlay automatically opened — not exercised here since this environment always has seed projects.)

## Preconditions
App is running. At least one project exists.

## Steps
1. Navigate to a project's stories page (/projects/:id/stories) to set the last project in localStorage.
2. Navigate to http://localhost:3000/.
3. Verify the page redirects to /projects/:id/stories (last visited project).
4. Clear localStorage key "app:last_project_id".
5. Navigate to http://localhost:3000/.
6. Verify the page redirects to a project's Stories view (fallback project) rather than to any `/projects` URL — no such route exists.

## Expected Result
- / redirects to /projects/:lastId/stories when a last-visited project is stored in localStorage.
- / redirects to a fallback project's Stories view (not to `/projects`) when no last-visited project is stored — project management is reached only via the global "Projects" overlay entry, never via a `/` redirect.

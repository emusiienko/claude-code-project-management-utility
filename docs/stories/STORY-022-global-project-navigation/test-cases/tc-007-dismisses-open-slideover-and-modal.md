---
id: tc-007
tags: @regression
story: STORY-022
status: Active
---

# tc-007: Navigating via the global entry dismisses an open Story slide-over / Task Detail modal

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one story that has at least one task

## Steps
1. Navigate to `/projects/:id/stories` for that project.
2. Click a story to open its slide-over.
3. Within the slide-over's task kanban, click a task to open the Task Detail modal on top of the slide-over.
4. With both the slide-over and the modal open, click the global "Projects" entry in the top bar.
5. Verify the app navigates to `/projects`.
6. Verify neither the Task Detail modal nor the Story slide-over remain visible.

## Expected Result
- Navigating to `/projects` via the global entry behaves like any other top-level navigation: any open Task Detail modal and Story slide-over are dismissed as a consequence of the route change, and the URL updates to `/projects`.

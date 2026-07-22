---
id: TC-164
tags: @smoke @regression
story: STORY-022
status: Active
---

# TC-164: Task Manager sidebar — "Manage projects" link removed

## Preconditions
- App is running at http://localhost:3000
- At least one project exists

## Steps
1. Navigate to `/projects/:id/stories` for an existing project (Task Manager mode).
2. Expand the left sidebar if it is collapsed.
3. Verify there is no "Manage projects" (or "⚙ Gestisci progetti") link anywhere in the sidebar.
4. Verify the project combobox at the top of the sidebar is still present and functional (opens, lists other projects).
5. Verify the project list below the combobox is still present, with the currently active project highlighted.
6. Verify the collapse/expand toggle still works as before.

## Expected Result
- The sidebar no longer contains a "Manage projects" link, nor any residual icon/label for it.
- The project combobox, project list, and collapse toggle remain fully functional and visually unchanged otherwise.
- There is now exactly one way to reach project management — the global top-bar entry.

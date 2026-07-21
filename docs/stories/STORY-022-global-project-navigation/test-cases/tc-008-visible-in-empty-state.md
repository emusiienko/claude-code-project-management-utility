---
id: tc-008
tags: @regression
story: STORY-022
status: Active
---

# tc-008: Global Projects entry remains visible when no projects exist yet

## Preconditions
- App is running at http://localhost:3000
- Use a disposable test environment/project where all projects can be deleted for this check without affecting other test data

## Steps
1. Delete all projects via the Projects Management page (`/projects`) so the page shows its empty state (no project rows).
2. Observe the top bar while on `/projects` — verify the "Projects" entry is still visible and clickable.
3. Switch the app switcher to Sessions mode.
4. Verify the "Projects" entry is still visible and clickable in Sessions mode.
5. Click it and verify it navigates to `/projects`, still showing the empty state.
6. Re-create at least one project afterward to restore the environment for subsequent test cases.

## Expected Result
- The global Projects entry remains visible and functional in both modes regardless of whether any projects exist.
- The empty state on `/projects` itself is unchanged by this story.

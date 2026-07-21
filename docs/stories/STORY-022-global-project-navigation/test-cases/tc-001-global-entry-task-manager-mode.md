---
id: tc-001
tags: @smoke @regression
story: STORY-022
status: Active
---

# tc-001: Global Projects entry — visible and functional in Task Manager mode

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects/:id/stories` for an existing project (Task Manager mode).
2. Observe the top bar.
3. Verify a "Projects" entry is visible in the top bar, positioned near the "Settings" button.
4. Click the "Projects" entry.
5. Verify the app navigates to `/projects`.
6. Verify the Projects Management page renders as before (project list, "New project" button) — unaffected by this story.

## Expected Result
- A "Projects" entry is visible in the top bar in Task Manager mode, near Settings.
- Clicking it navigates to `/projects`.
- The Projects Management page itself behaves exactly as it did before this story.

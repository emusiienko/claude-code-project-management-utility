---
id: TC-160
tags: @smoke @regression
story: STORY-022
status: Active
---

# TC-160: Global Projects entry — opens the Projects overlay in Task Manager mode

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects/:id/stories` for an existing project (Task Manager mode).
2. Observe the top bar — a "Projects" entry (button) is visible, positioned near "Config".
3. Click the "Projects" entry.
4. Verify a right-side slide-over panel opens showing the project list (name, description, edit/delete actions, "New project"), and the underlying Stories view remains visible and unchanged behind a dimmed backdrop.
5. Verify the URL does not change when the panel opens.
6. Click "Dismiss" (the X icon in the panel header).
7. Verify the panel closes and the Stories view underneath is exactly as it was, with no navigation having occurred.

## Expected Result
- The "Projects" entry is visible in the top bar in Task Manager mode, near Config.
- Clicking it opens a slide-over panel with the project list, without changing the URL or unmounting the main view.
- Dismiss closes the panel and reveals the main view unchanged.

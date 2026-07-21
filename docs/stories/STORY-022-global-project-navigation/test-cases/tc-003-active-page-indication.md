---
id: tc-003
tags: @regression
story: STORY-022
status: Active
---

# tc-003: Global Projects entry — active/current-page indication

## Preconditions
- App is running at http://localhost:3000
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects` directly.
2. Observe the "Projects" entry in the top bar.
3. Compare its visual state (highlight, underline, or color change) against the established current-page indication pattern used elsewhere in the app (e.g. the active tab in a project's sub-navigation, or the active project in the sidebar list).
4. Confirm the "Projects" entry shows a clearly distinguishable current-page state while on `/projects`.
5. Navigate away to `/projects/:id/stories`.
6. Verify the "Projects" entry no longer shows the current-page indication.

## Expected Result
- While on `/projects`, the "Projects" top-bar entry shows a clear current-page indication, visually consistent with other active-state indicators already used in the app.
- Navigating away from `/projects` removes that indication.

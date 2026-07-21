---
id: tc-002
tags: @smoke @regression
story: STORY-022
status: Active
---

# tc-002: Global Projects entry — visible and functional in Sessions mode

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/sessions`.
2. Observe the top bar.
3. Verify a "Projects" entry is visible in the top bar.
4. Verify the "Settings" button is NOT visible (Settings stays Task-Manager-only; this story does not change that).
5. Click the "Projects" entry.
6. Verify the app navigates to `/projects`.

## Expected Result
- The "Projects" entry is visible and clickable in Sessions mode, even though the Settings button is absent.
- Clicking it navigates to `/projects` from Sessions mode too.

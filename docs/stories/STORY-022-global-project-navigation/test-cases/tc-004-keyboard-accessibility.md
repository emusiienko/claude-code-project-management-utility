---
id: tc-004
tags: @regression
story: STORY-022
status: Active
---

# tc-004: Global Projects entry — keyboard accessibility

## Preconditions
- App is running at http://localhost:3000
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects/:id/stories` for an existing project.
2. Click into the page body, then press Tab repeatedly until keyboard focus reaches the "Projects" entry in the top bar.
3. Verify a visible focus indicator (ring/outline) appears on the entry, consistent with the styling of other focusable top-bar controls (e.g. the Settings button).
4. With focus on the "Projects" entry, press Enter (or Space).
5. Verify the app navigates to `/projects`.

## Expected Result
- The "Projects" entry is reachable via keyboard Tab navigation.
- A visible focus indicator appears, matching the styling used by other top-bar controls.
- Activating it via keyboard navigates to `/projects`.

---
id: tc-002
tags: @smoke @regression
story: STORY-022
status: Active
---

# tc-002: Global Projects and Config entries — visible and functional in Sessions mode

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/sessions`.
2. Observe the top bar — both "Projects" and "Config" entries are visible (Config is now global, not Task-Manager-only).
3. Click "Projects". Verify the project-list overlay opens over the Sessions main view; the URL stays `/sessions`.
4. Dismiss the panel. Click "Config". Verify the system dictionary overlay opens over the Sessions main view; the URL stays `/sessions`.
5. Dismiss the panel.

## Expected Result
- Both "Projects" and "Config" are visible and clickable in Sessions mode.
- Each opens its respective overlay over the Sessions main view without navigating away from `/sessions`.

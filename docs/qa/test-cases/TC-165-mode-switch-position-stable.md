---
id: TC-165
tags: @regression
story: STORY-022
status: Active
---

# TC-165: Mode switching does not move or hide the global Projects/Config entries

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects/:id/stories` (Task Manager mode). Measure the on-screen position of both "Projects" and "Config" in the top bar.
2. Switch to Sessions mode via the app switcher combobox.
3. Verify both entries remain in the exact same position, with the same labels and appearance — Config is now global (always mounted in both modes), so there is no sibling-visibility change to account for either.
4. Switch back to Task Manager mode via the app switcher.
5. Verify both entries are still in the same position, unaffected by the round trip through Sessions mode.

## Expected Result
- Both global entries' positions and appearance are pixel-identical in both modes at every step.

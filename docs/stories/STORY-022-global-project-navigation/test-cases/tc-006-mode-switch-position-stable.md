---
id: tc-006
tags: @regression
story: STORY-022
status: Active
---

# tc-006: Mode switching does not move or hide the global Projects entry

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects/:id/stories` (Task Manager mode). Note the position and appearance of the "Projects" entry in the top bar.
2. Switch to Sessions mode via the app switcher combobox.
3. Verify the "Projects" entry remains in the exact same position in the top bar, with the same label and appearance (aside from the Settings button now being absent next to it).
4. Switch back to Task Manager mode via the app switcher.
5. Verify the "Projects" entry is still in the same position, unaffected by the round trip through Sessions mode.

## Expected Result
- The global Projects entry's position and appearance are identical in both modes.
- Only the presence of the sibling Settings button changes (visible in Task Manager mode, absent in Sessions mode) — the Projects entry itself never moves or changes appearance.

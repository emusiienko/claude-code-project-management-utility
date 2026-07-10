---
id: TC-034
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-034: Sessions mode — no sidebar, no sub-nav, no Settings button

## Preconditions
App is running.

## Steps
1. Navigate to http://localhost:3000/sessions.
2. Verify the combobox shows "Sessions".
3. Verify no sidebar is rendered.
4. Verify no sub-nav bar is rendered.
5. Verify the Settings button is not visible in the top bar.
6. Verify the Sessions placeholder screen is shown.

## Expected Result
- /sessions renders without sidebar and without sub-nav.
- "Settings" top-bar button is hidden in Sessions mode.
- Combobox shows "Sessions" as the active mode.

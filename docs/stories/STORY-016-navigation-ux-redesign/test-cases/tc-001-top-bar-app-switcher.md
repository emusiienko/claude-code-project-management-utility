---
id: tc-001
tags: @smoke @regression
story: STORY-016
status: Active
---

# tc-001: Top bar and app switcher

## Preconditions
App is running at http://localhost:3000.

## Steps
1. Navigate to http://localhost:3000/projects.
2. Observe the top bar.
3. Verify a combobox (app switcher) is visible on the left showing "Task Manager".
4. Verify a "Settings" button with gear icon is visible on the right.
5. Select "Sessions" from the combobox.
6. Verify the page navigates to /sessions.
7. Verify the "Settings" button is no longer visible.
8. Verify the combobox now shows "Sessions".
9. Select "Task Manager" from the combobox.
10. Verify navigation returns to the last Task Manager URL (/projects/:id/stories or /projects).

## Expected Result
- Top bar contains only the app switcher combobox and the Settings button (no flat nav bar).
- "Settings" button is visible in Task Manager mode.
- "Settings" button is hidden in Sessions mode.
- Switching to Sessions navigates to /sessions.
- Switching back to Task Manager restores the last visited Task Manager URL.

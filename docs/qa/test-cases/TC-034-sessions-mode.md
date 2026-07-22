---
id: TC-034
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-034: Sessions mode — no sidebar, no sub-nav, global Projects/Config entries still present

> Updated 2026-07-22 (STORY-022 reconcile): the global "Projects" and "Config" top-bar entries are now mounted in every mode, including Sessions — they are no longer hidden here. This reverses the former "Settings button is not visible" assertion; the entries' own visibility/behavior is otherwise covered by their dedicated test cases.

## Preconditions
App is running.

## Steps
1. Navigate to http://localhost:3000/sessions.
2. Verify the combobox shows "Sessions".
3. Verify no sidebar is rendered.
4. Verify no sub-nav bar is rendered.
5. Verify the global "Projects" and "Config" entries ARE visible in the top bar and are clickable (opening their respective overlays).
6. Verify the Sessions placeholder screen is shown.

## Expected Result
- /sessions renders without sidebar and without sub-nav.
- The global "Projects" and "Config" top-bar entries remain visible and functional in Sessions mode — identical to Task Manager mode.
- Combobox shows "Sessions" as the active mode.

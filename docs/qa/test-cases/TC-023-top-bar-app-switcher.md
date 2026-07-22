---
id: TC-023
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-023: Top bar and app switcher

> Updated 2026-07-22 (STORY-022 reconcile): the `/projects` full-page route no longer exists — Project Management is now reached via a global "Projects" overlay entry, not a route. `/settings` is likewise gone — "Config" is a global overlay entry, no longer a Task-Manager-only route-based button. This TC is re-scoped to the app-switcher combobox mechanics only; the Projects/Config overlay entries' own visibility, active-state, and panel behavior are covered by their own dedicated test cases.

## Preconditions
App is running at http://localhost:3000. At least one project exists.

## Steps
1. Navigate to a project's Stories view (`/projects/:id/stories`, Task Manager mode).
2. Observe the top bar.
3. Verify a combobox (app switcher) is visible on the left showing "Task Manager".
4. Verify "Projects" and "Config" entries are visible on the right.
5. Select "Sessions" from the combobox.
6. Verify the page navigates to `/sessions`.
7. Verify "Projects" and "Config" are still visible (both are global, mounted in every mode).
8. Verify the combobox now shows "Sessions".
9. Select "Task Manager" from the combobox.
10. Verify navigation returns to the last Task Manager URL (`/projects/:id/stories`).

## Expected Result
- Top bar contains the app switcher combobox plus the global "Projects" and "Config" entries (no flat nav bar).
- "Projects" and "Config" are visible in both Task Manager mode and Sessions mode — neither is hidden by a mode switch.
- Switching to Sessions navigates to `/sessions`.
- Switching back to Task Manager restores the last visited Task Manager URL.

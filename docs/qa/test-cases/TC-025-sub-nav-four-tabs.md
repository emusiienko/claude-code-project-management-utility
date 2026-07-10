---
id: TC-025
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-025: Sub-nav — four tabs, active highlight, Milestones placeholder

## Preconditions
App is running. At least one project exists.

## Steps
1. Navigate to /projects/:id/stories.
2. Verify the sub-nav bar shows four tabs: Stories, Board, Milestones, Settings.
3. Verify the Stories tab is visually highlighted (underline or color).
4. Click the Board tab.
5. Verify URL changes to /projects/:id/board and Board tab is highlighted.
6. Click the Milestones tab.
7. Verify URL changes to /projects/:id/milestones and Milestones tab is highlighted.
8. Verify a placeholder screen is shown (STORY-012 not yet implemented).
9. Click the Settings tab.
10. Verify URL changes to /projects/:id/settings and Settings tab is highlighted.

## Expected Result
- Sub-nav shows exactly four tabs: Stories, Board, Milestones, Settings.
- Active tab is visually highlighted.
- Each tab navigates to the correct URL.
- Milestones tab shows a placeholder screen (no regression from previous behavior).

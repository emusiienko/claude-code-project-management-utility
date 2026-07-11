---
id: TC-042
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-042: Board — active milestone filter applied on load, toggle to show all

## Preconditions
- App is running at http://localhost:3000.
- A project exists with an "Active" milestone (e.g. "Sprint 1").
- At least two stories are assigned to "Sprint 1"; at least one story belongs to the project but is NOT assigned to "Sprint 1".

## Steps
1. Navigate to the Board view for the project (/projects/:id/board).
2. Observe which stories are displayed.
3. Verify only stories assigned to "Sprint 1" are shown on the board.
4. Verify a visible filter indicator is present showing the active milestone name "Sprint 1" (label, chip, or badge).
5. Observe the "show all" toggle (button or switch) associated with the filter indicator.
6. Click the "show all" toggle.
7. Verify all stories for the project are now visible on the board, including the one not assigned to "Sprint 1".
8. Verify the filter indicator label changes to reflect "showing all" (or the indicator is replaced by a toggle state).
9. Navigate away from the board (e.g. to the Stories tab) and return to the Board.
10. Verify the milestone filter is reapplied on reload (the "show all" toggle does not persist across navigation).

## Expected Result
- When a project has an Active milestone, the Board loads showing only stories assigned to that milestone.
- A visible filter label shows the active milestone name.
- The "show all" toggle reveals all stories.
- The "show all" state does not persist after navigating away and returning.

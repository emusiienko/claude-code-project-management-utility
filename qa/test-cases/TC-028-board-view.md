---
id: TC-028
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-028: Board view — kanban columns by status, card click opens slide-over

## Preconditions
App is running. Project with at least one story exists.

## Steps
1. Navigate to /projects/:id/board.
2. Verify the Board tab is highlighted in sub-nav.
3. Verify the kanban board shows one column per story status (planned, in-progress, pending-approval, accepted).
4. Verify each story card shows its title and task aggregate (Tasks: N/A if none).
5. Verify clicking a story card opens the slide-over and URL changes to /projects/:id/stories/:storyId.
6. Close the slide-over.
7. Attempt to drag a card from one column to another.
8. Verify the card moves visually to the target column.
9. Verify a PUT request is made to update the story status.

## Expected Result
- Board renders with correct column headers.
- Story cards show title and task aggregate.
- Card click opens the slide-over correctly.
- Drag-and-drop moves the card to the target column and updates story status via API.

## Note
Step 7-9 could not be verified with JavaScript synthetic events (dnd-kit requires real browser pointer events). Manual or automation-level verification required for drag-and-drop.

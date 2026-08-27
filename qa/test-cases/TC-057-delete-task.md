---
id: TC-057
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-057: Delete Task via Context Menu

## Preconditions

- App is running at `http://localhost:3000`
- At least one story has at least two tasks (so one can be deleted and the board is not empty)
- Note the exact task title and the column count before starting

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story with at least two tasks
3. Note the current aggregate counter value (e.g. "1/3 done") and the count in the column of the task to delete
4. Hover over a task card
5. Click the ⋯ context menu icon
6. Click "Delete"
7. Verify a confirmation dialog appears:
   - [ ] Dialog title or message confirms the action (e.g. "Delete task?")
   - [ ] Two actions are available: Cancel and Delete (or equivalent)
8. Click Cancel
9. Verify the task card is still present on the board (dialog closed, nothing changed)
10. Hover over the same task card again, open ⋯ menu, click Delete
11. Click the Delete (confirm) button in the dialog
12. Verify:
    - [ ] The task card is removed from the board
    - [ ] The column header count decreases by 1
    - [ ] The aggregate counter above the board updates accordingly (total_tasks decreases by 1)

## Expected Result

Clicking Cancel in the confirmation dialog leaves the task intact. Confirming deletion removes the card from the board, decrements the column count, and updates the aggregate counter. No error is shown.

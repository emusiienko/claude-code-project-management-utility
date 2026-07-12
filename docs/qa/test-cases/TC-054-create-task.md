---
id: TC-054
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-054: Create Task via Column Footer Button

## Preconditions

- App is running at `http://localhost:3000`
- At least one project exists with at least one story
- The project's effective `task_statuses`, `task_types`, and `participant_roles` dictionaries are populated

## Steps

1. Set viewport to 1280px
2. Navigate to the Story Detail slide-over for a story (`/projects/:id/stories/:storyId`)
3. Observe the Kanban board is visible with at least one column
4. Click the "Add task" button at the bottom of any column (e.g. the first column, status = "Todo")
5. Observe a create form appears
6. Verify:
   - [ ] The status field is pre-filled with the column's status value
   - [ ] The status field is read-only (cannot be changed in this form)
   - [ ] The Submit button is disabled (title and type are empty)
7. Fill in the title field with a valid value (e.g. "Test task one")
8. Verify Submit is still disabled (type not yet selected)
9. Select a value from the "type" dropdown
10. Verify Submit is now enabled
11. Click Submit
12. Observe:
    - [ ] The new task card appears in the correct status column
    - [ ] The column header count increments by 1
    - [ ] The aggregate counter above the board updates (e.g. from "0/0 done" to "0/1 done")

## Expected Result

A task is created with the status pre-filled from the column footer button. The form enforces title + type as required. After submission the card is visible in the correct column, the column count and aggregate counter reflect the new task.

---
id: TC-066
tags: @regression
story: STORY-005
status: Active
---

# TC-066: Create Task — Required Field Validation (Title and Type)

## Preconditions

- App is running at `http://localhost:3000`
- A story's Kanban board is open with at least one column

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over and click "Add task" at the bottom of a column
3. Leave all fields empty
4. Verify Submit button is disabled
5. Fill in only the title (e.g. "Only title")
6. Verify Submit button is still disabled (type is required)
7. Clear the title; select only a type from the dropdown
8. Verify Submit button is still disabled (title is required)
9. Fill in title again so both title and type are filled
10. Verify Submit button is enabled
11. Clear the title field (backspace to empty)
12. Verify Submit button becomes disabled again

## Expected Result

The Submit button is enabled only when both title and type have values. Removing either required field disables Submit again. No server request is made while the form is invalid.

---
id: TC-016
tags: @smoke @regression
story: STORY-004
status: Active
---

# TC-016: Edit story — modal pre-filled and save updates in place

## Preconditions
- App is running at http://localhost:3000
- At least one project exists with at least one story that has a title, status, and at least one label
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. Locate an existing story row in the table
2. Click the Edit (pencil) icon on that row
3. Verify: modal opens pre-filled with the story's current Title
4. Verify: modal is pre-filled with the story's current Status value
5. Verify: modal is pre-filled with the story's current Labels
6. Change the Title to "Updated story title"
7. Click the Save / Update button
8. Observe the result

## Expected Result
- Edit modal opens with all fields pre-filled to the current story values (not empty, not default values)
- After saving, the modal closes
- The row in the table updates in place — "Updated story title" appears without a full page reload
- The status badge and label chips on the row reflect the saved values
- No error message is shown

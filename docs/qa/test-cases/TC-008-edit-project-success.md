---
id: TC-008
tags: @regression
story: STORY-003
status: Active
---

# TC-008: Edit project — update name and description, list reflects changes

## Preconditions
- App is running at http://localhost:3000
- Viewport: 1280px (desktop)
- At least one project exists (e.g. "Test Project Alpha")

## Steps

1. Navigate to `/`
2. Locate the row for an existing project in the list
3. Click the Edit action button for that project
4. Verify that a modal/dialog opens pre-populated with the current name and description
5. Change the name to a new unique value (e.g. "Renamed Project")
6. Change the description to new text (e.g. "Updated description")
7. Submit the form
8. Observe the result

## Expected Result
- The edit modal opens with existing values pre-filled (step 4)
- After submission the modal closes
- The project row in the list shows the updated name and description
- No error message is shown

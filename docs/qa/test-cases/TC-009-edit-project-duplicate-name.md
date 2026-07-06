---
id: TC-009
tags: @regression
story: STORY-003
status: Active
---

# TC-009: Edit project — duplicate name shows inline conflict error

## Preconditions
- App is running at http://localhost:3000
- Viewport: 1280px (desktop)
- Two projects exist: "Project Alpha" and "Project Beta"

## Steps

1. Navigate to `/`
2. Click the Edit action button for "Project Alpha"
3. Clear the name field and enter "Project Beta" (the name of the other project)
4. Submit the form

## Expected Result
- The modal stays open (does not close)
- An inline error message is displayed containing the text "A project with this name already exists."
- The project name in the list remains unchanged

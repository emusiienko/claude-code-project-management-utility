---
id: TC-007
tags: @regression
story: STORY-003
status: Active
---

# TC-007: Create project — duplicate name shows inline conflict error

## Preconditions
- App is running at http://localhost:3000
- Viewport: 1280px (desktop)
- A project named "Existing Project" already exists

## Steps

1. Navigate to `/`
2. Click the "Create project" button
3. Enter "Existing Project" in the name field (same name as an existing project)
4. Submit the form

## Expected Result
- The modal stays open (does not close)
- An inline error message is displayed containing the text "A project with this name already exists."
- No new project is added to the list

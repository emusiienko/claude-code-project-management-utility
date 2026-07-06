---
id: TC-010
tags: @regression
story: STORY-003
status: Active
---

# TC-010: Delete project — confirmation dialog warns about nested data, project is removed

## Preconditions
- App is running at http://localhost:3000
- Viewport: 1280px (desktop)
- At least one project exists

## Steps

1. Navigate to `/`
2. Click the Delete action button for an existing project
3. Verify that a confirmation dialog opens
4. Read the confirmation dialog content
5. Confirm the deletion

## Expected Result
- A confirmation dialog appears before any deletion occurs (step 3)
- The dialog explicitly communicates that nested data (stories, tasks, attachments, comments, settings overrides) will be permanently removed (step 4)
- After confirmation the project is removed from the list
- No error message is shown

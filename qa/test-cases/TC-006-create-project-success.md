---
id: TC-006
tags: @regression
story: STORY-003
status: Active
---

# TC-006: Create project — form open, submit, list refresh

## Preconditions
- App is running at http://localhost:3000
- Viewport: 1280px (desktop)

## Steps

1. Navigate to `/`
2. Click the "Create project" button
3. Verify that a modal/dialog opens with a form
4. Verify the form contains a name field (required) and a description field (optional)
5. Enter a unique name (e.g. "Test Project Alpha") in the name field
6. Enter a description (e.g. "A description for testing") in the description field
7. Submit the form
8. Observe the result

## Expected Result
- The modal opens with a visible form on step 3
- Name field is marked as required; description is optional (step 4)
- After submission the modal closes
- The new project appears in the list without a full page reload
- No error message is shown

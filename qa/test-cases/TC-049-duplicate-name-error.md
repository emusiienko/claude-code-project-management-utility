---
id: TC-049
tags: @regression
story: STORY-012
status: Active
---

# TC-049: Edge case — duplicate milestone name within the same project shows conflict error

## Preconditions
- App is running at http://localhost:3000.
- A project exists with a milestone named "Sprint 1".

## Steps
1. Navigate to the Milestones tab for the project.
2. Click "Create milestone".
3. Enter the name "Sprint 1" (exactly matching the existing milestone name).
4. Submit the form.
5. Observe the result.

## Expected Result
- The form submission is rejected with a visible error message indicating the name is already taken within this project, such as: "A milestone named 'Sprint 1' already exists in this project."
- The form remains open so the user can correct the name.
- No duplicate milestone is created.

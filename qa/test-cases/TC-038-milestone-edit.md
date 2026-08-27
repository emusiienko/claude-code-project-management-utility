---
id: TC-038
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-038: Edit a milestone — name and description update

## Preconditions
- App is running at http://localhost:3000.
- A project exists with at least one milestone named "Sprint 1" with no description.

## Steps
1. Navigate to the Milestones tab for the project.
2. Open the edit action for the "Sprint 1" milestone (button, context menu, or inline edit).
3. Verify the edit form pre-fills with the current name "Sprint 1".
4. Clear the name field and submit.
5. Verify a validation error is shown; the milestone is not saved with an empty name.
6. Enter a new name "Sprint 1 — Updated" and add a description "Updated description".
7. Submit the form.
8. Verify the milestone row in the list now shows the updated name and description.

## Expected Result
- The edit form pre-fills the current name and description.
- Clearing the name and submitting shows a validation error.
- A valid name and description update is saved and reflected immediately in the list.
- The milestone status is unchanged after editing name/description.

---
id: tc-013
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-013: Story view — current milestone assignment is visible in slide-over and can be changed

## Preconditions
- App is running at http://localhost:3000.
- A project exists with a milestone "Sprint 1".
- A story in that project is assigned to "Sprint 1".

## Steps
1. Navigate to the Stories list for the project.
2. Click the story title to open the story slide-over (or detail view).
3. Observe the story detail panel.
4. Verify a milestone field is visible and displays "Sprint 1".
5. Verify the milestone field is interactive (e.g. shows a dropdown or edit trigger on click/hover).
6. Change the milestone to a different one (if more than one exists) or clear it.
7. Verify the change is reflected immediately in the slide-over without requiring a full page reload.

## Expected Result
- The slide-over shows the current milestone assignment.
- The field is interactive — the user can change or clear the assignment inline.
- Changes take effect and are displayed immediately.

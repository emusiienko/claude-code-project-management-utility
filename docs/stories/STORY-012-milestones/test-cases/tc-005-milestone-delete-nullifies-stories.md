---
id: tc-005
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-005: Delete a milestone — assigned stories lose milestone link, stories not deleted

## Preconditions
- App is running at http://localhost:3000.
- A project exists with a milestone "Sprint 1" that has at least two stories assigned to it.
- The stories are visible in the Stories list for that project.

## Steps
1. Navigate to the Milestones tab for the project.
2. Note the names of the stories assigned to "Sprint 1".
3. Trigger the delete action for "Sprint 1" (button or context menu).
4. Verify a confirmation prompt appears before deletion.
5. Confirm the deletion.
6. Verify "Sprint 1" no longer appears in the milestones list.
7. Navigate to the Stories list for the project.
8. Verify the stories that were assigned to "Sprint 1" still exist.
9. Open one of those stories (slide-over or detail view).
10. Verify the milestone field for that story is now empty / unassigned.

## Expected Result
- A confirmation prompt is shown before deleting a milestone.
- After deletion, the milestone no longer appears in the milestones list.
- All stories previously assigned to the deleted milestone still exist in the stories list — none are deleted.
- The milestone field on previously assigned stories is now empty.

---
id: tc-012
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-012: Story form — assign and clear milestone; only same-project milestones shown

## Preconditions
- App is running at http://localhost:3000.
- Project A exists with two milestones: "Sprint 1" (Planned), "Sprint 2" (Active).
- Project B exists with its own milestone "Milestone B".
- At least one story exists in Project A.

## Steps
1. Navigate to the Stories list for Project A.
2. Open the edit form or slide-over for an existing story.
3. Locate the milestone field (dropdown or select control).
4. Verify the dropdown lists only milestones belonging to Project A: "Sprint 1" and "Sprint 2".
5. Verify "Milestone B" (from Project B) is NOT present in the dropdown.
6. Select "Sprint 1" from the dropdown.
7. Save the story.
8. Verify the milestone field on the story shows "Sprint 1".
9. Open the story edit form again.
10. Clear the milestone field (select "None" or equivalent).
11. Save the story.
12. Verify the milestone field on the story is now empty / unassigned.

## Expected Result
- The milestone dropdown in the story form contains only milestones from the same project.
- Cross-project milestones are not shown.
- Assigning a milestone saves and is displayed on the story.
- Clearing the milestone saves as null — the field is empty after save.

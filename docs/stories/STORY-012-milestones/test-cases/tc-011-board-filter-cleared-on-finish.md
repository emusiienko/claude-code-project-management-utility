---
id: tc-011
tags: @regression
story: STORY-012
status: Active
---

# tc-011: Board — filter removed when Active milestone is set to Finished

## Preconditions
- App is running at http://localhost:3000.
- A project exists with an "Active" milestone "Sprint 1" with at least one story assigned to it and one story not assigned.
- The Board view is open and shows only the assigned story (filter applied).

## Steps
1. Confirm the Board is filtering by "Sprint 1" (filter indicator visible, only assigned stories shown).
2. Navigate to the Milestones tab for the project.
3. Mark "Sprint 1" as "Finished".
4. Navigate back to the Board view for the project.
5. Observe the board.
6. Verify no filter indicator is visible.
7. Verify all project stories are displayed (including the story that was not assigned to "Sprint 1").

## Expected Result
- After finishing the active milestone, the Board no longer applies any milestone filter.
- All stories are shown without a filter indicator.

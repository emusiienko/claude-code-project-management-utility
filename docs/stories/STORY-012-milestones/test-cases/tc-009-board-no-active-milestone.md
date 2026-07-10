---
id: tc-009
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-009: Board — no active milestone shows all stories with no filter indicator

## Preconditions
- App is running at http://localhost:3000.
- A project exists with stories but NO "Active" milestone (all milestones are "Planned" or "Finished", or none exist).

## Steps
1. Navigate to the Board view for the project (/projects/:id/board).
2. Observe the board header or toolbar area.
3. Verify no filter indicator or active milestone label is visible.
4. Verify no "show all" toggle is present.
5. Verify all stories in the project appear on the board across their respective status columns.

## Expected Result
- When no active milestone exists for the project, the Board shows all stories unfiltered.
- No filter label, chip, or milestone indicator is visible.
- No "show all" toggle is present.

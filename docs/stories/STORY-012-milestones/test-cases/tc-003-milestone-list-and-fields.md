---
id: tc-003
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-003: Milestones tab list — name, status badge, story count, description

## Preconditions
- App is running at http://localhost:3000.
- A project exists with at least two milestones: one with stories assigned, one without.

## Steps
1. Navigate to the Milestones tab for the project.
2. Observe each milestone row in the list.
3. Verify each row displays: name, a status badge (one of "Planned", "Active", "Finished"), a story count, and description (or empty if none).
4. For the milestone with no stories assigned, verify the story count shows 0.
5. For the milestone with stories assigned, verify the story count matches the number of assigned stories.
6. Verify the description is truncated if longer than the available space (no overflow outside the row).

## Expected Result
- Each milestone row shows name, status badge, story count, and description column.
- Story counts are accurate.
- Long descriptions are truncated within the row boundary — no text overflow.
- No horizontal scrollbar appears on the milestones list.

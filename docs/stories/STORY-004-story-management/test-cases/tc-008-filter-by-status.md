---
id: tc-008
tags: @regression
story: STORY-004
status: Active
---

# tc-008: Filter bar — filter by status

## Preconditions
- App is running at http://localhost:3000
- At least one project exists with at least two stories that have different status values
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. Note all stories currently visible in the table
2. In the filter bar, open the Status dropdown
3. Verify: the Status dropdown is populated with the project's configured status values
4. Select one status value that is used by at least one story and not by at least one other story
5. Observe the table after applying the filter
6. Select a different status value that no story currently has
7. Observe the table
8. Clear the Status filter (select blank/all)
9. Observe the table

## Expected Result
- Status dropdown is populated with the project's configured values (not hard-coded)
- After selecting a status: only stories with that status are shown; other stories are hidden
- After selecting a status with no matching stories: the table shows an empty state or zero rows
- After clearing the filter: all stories are shown again
- Filter bar remains visible and accessible throughout

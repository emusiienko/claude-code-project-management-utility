---
id: tc-014
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-014: Milestone Detail page — shows milestone info and assigned stories list

## Preconditions
- App is running at http://localhost:3000.
- A project exists with a milestone "Sprint 1" that has at least two stories assigned to it.

## Steps
1. Navigate to the Milestones tab for the project.
2. Click on the "Sprint 1" milestone row (or its name link) to open the Milestone Detail page.
3. Verify the page renders at a URL resembling /milestones/:id.
4. Verify the milestone name "Sprint 1" is displayed as the page title or heading.
5. Verify the milestone status is displayed.
6. Verify the milestone description is displayed (or an empty state if none).
7. Verify a list of assigned stories is shown with pagination controls if there are more than the page size.
8. Navigate to page 2 if pagination is present; verify it loads without error.

## Expected Result
- The Milestone Detail page renders at the correct route.
- The page shows: name, status, description, and a paginated list of assigned stories.
- Pagination works without errors.
- If no stories are assigned, an appropriate empty state is shown (no crash).

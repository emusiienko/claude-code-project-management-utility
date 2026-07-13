---
id: TC-071
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-071: Task Detail Modal — Add a link between two tasks and verify display

## Preconditions
- App is running at http://localhost:3000
- A project exists with a story containing at least two tasks (Task A and Task B)
- The project's effective `link_types` dictionary contains at least one entry (e.g. "depends_on")
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for Task A (navigate to the story slide-over, click Task A card)
2. In the Links section, click "Add link" (or equivalent trigger)
3. In the Add link form, type the title of Task B in the search/target field
4. Select Task B from the search results
5. Choose a directional label from the dropdown (e.g. "depends on")
6. Submit the form

## Expected Result
- After submission, the Add link form closes or resets
- The Links list refreshes without a full page reload
- A new row appears in the Links section with:
  - A direction indicator showing outbound (e.g. "→")
  - The link type displayed as a human-readable badge (e.g. "depends on")
  - Task B's title displayed as the linked item
- The row is visually consistent with the rest of the section (font, spacing, alignment)
- No error message or spinner remains visible after the operation

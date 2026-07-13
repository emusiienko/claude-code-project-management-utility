---
id: TC-079
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-079: Story slide-over — Links section renders correctly

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least two stories
- Browser viewport set to 1280px wide

## Steps
1. Navigate to the project's Stories screen
2. Click on a story row to open the Story slide-over
3. Locate the right panel of the slide-over and find the "Links" section

## Expected Result
- A "Links" section is visible in the Story slide-over right panel
- The section header is clearly labeled
- An "Add link" control is visible within the section
- When no story links exist, an empty state (placeholder text or empty list) is shown — no error, no spinner
- The Links section does not overlap with the Task Kanban or other sections
- No horizontal scrollbar appears in the slide-over
- No "Something went wrong" overlay or console error on page load

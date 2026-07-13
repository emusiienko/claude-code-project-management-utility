---
id: tc-001
tags: @smoke @regression
story: STORY-006
status: Active
---

# tc-001: Task Detail Modal — Links section renders correctly

## Preconditions
- App is running at http://localhost:3000
- At least one project exists with at least one story containing at least two tasks
- Browser viewport set to 1280px wide

## Steps
1. Navigate to a project's Stories screen
2. Click on a story row to open the Story slide-over
3. In the Task Kanban inside the slide-over, click a task card to open the Task Detail Modal
4. Scroll to the "Links" section of the modal

## Expected Result
- A "Links" section is visible in the Task Detail Modal
- The section header is clearly labeled (e.g. "Links" or similar)
- An "Add link" control (button or inline form trigger) is visible within the section
- When no links exist, the section shows an empty state (placeholder text or empty list — no error, no spinner)
- The section does not overflow its container; no horizontal scrollbar appears
- No "Something went wrong" overlay or console error on page load

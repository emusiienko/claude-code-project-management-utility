---
id: tc-008
tags: @regression
story: STORY-006
status: Active
---

# tc-008: Task Detail Modal — Duplicate task link attempt shows a conflict error

## Preconditions
- App is running at http://localhost:3000
- A link already exists: Task A → Task B with `link_type` "depends_on"
- Task A's Task Detail Modal is open
- Browser viewport set to 1280px wide

## Steps
1. In Task A's Links section, click "Add link"
2. Search for and select Task B as the target
3. Select the same `link_type` ("depends_on") that was used for the existing link
4. Submit the form

## Expected Result
- The form does not create a second link
- An inline error message appears informing the user that this link already exists (e.g. "This link already exists" or similar)
- The existing link row remains unchanged in the Links list
- No duplicate row appears

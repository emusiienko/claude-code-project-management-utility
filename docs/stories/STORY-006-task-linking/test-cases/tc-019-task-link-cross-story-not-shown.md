---
id: tc-019
tags: @regression
story: STORY-006
status: Active
---

# tc-019: Task Add link form — tasks from other stories do not appear in search results

## Preconditions
- App is running at http://localhost:3000
- The project has at least two stories:
  - Story X with Task A and Task B
  - Story Y with Task C
- Task A's Task Detail Modal is open (from Story X)
- Browser viewport set to 1280px wide

## Steps
1. In Task A's Links section, click "Add link"
2. In the target task search field, type the title of Task C (which belongs to Story Y)
3. Observe the search results

## Expected Result
- Task C does not appear in the search results dropdown
- Only tasks from the same story (Story X) appear as valid targets
- If no matching same-story tasks are found, an empty state or "no results" message is shown
- No error message or crash occurs from the search attempt

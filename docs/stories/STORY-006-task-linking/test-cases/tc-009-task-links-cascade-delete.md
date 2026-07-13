---
id: tc-009
tags: @regression
story: STORY-006
status: Active
---

# tc-009: Task links disappear after the linked task is deleted

## Preconditions
- App is running at http://localhost:3000
- Task A and Task B are linked; Task A's Task Detail Modal shows the link to Task B
- Browser viewport set to 1280px wide

## Steps
1. Note the link to Task B visible in Task A's Links section
2. Close Task A's modal
3. Delete Task B from the Task Kanban (use the Delete button on Task B's card, confirm deletion)
4. Re-open Task A's Task Detail Modal

## Expected Result
- Task A's Links section no longer shows any link row referencing Task B
- The section shows an empty state or a shorter list — no broken/orphaned link row appears
- No error message or spinner remains in the Links section
- The overall Task Detail Modal loads without errors

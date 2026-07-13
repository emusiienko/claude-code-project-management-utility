---
id: tc-006
tags: @regression
story: STORY-006
status: Active
---

# tc-006: Task Detail Modal — Cancel delete does not remove the task link

## Preconditions
- App is running at http://localhost:3000
- Task A and Task B are linked; Task A's Task Detail Modal is open
- Browser viewport set to 1280px wide

## Steps
1. In Task A's Links section, click the Delete button on the link row for Task B
2. When the confirmation dialog appears, click "Cancel" (or close the dialog)
3. Observe the Links section

## Expected Result
- The dialog closes without removing the link
- The link row for Task B remains visible in the Links section
- No error message appears
- The UI state is identical to before the Delete button was clicked

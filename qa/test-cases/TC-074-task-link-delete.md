---
id: TC-074
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-074: Task Detail Modal — Delete a task link via confirmation dialog

## Preconditions
- App is running at http://localhost:3000
- Task A and Task B are linked; Task A's Task Detail Modal is open
- Browser viewport set to 1280px wide

## Steps
1. In Task A's Links section, locate the link row for Task B
2. Click the Delete button (or trash icon) on the link row
3. Observe the confirmation dialog that appears
4. Click "Confirm" (or equivalent) in the dialog

## Expected Result
- Clicking Delete opens a confirmation dialog before any deletion occurs
- The dialog clearly communicates which link is about to be removed
- After confirming, the dialog closes
- The link row for Task B disappears from the Links section without a full page reload
- The Links section shows the updated (shorter) list; empty state is shown if no links remain
- No error message or orphaned UI element remains after deletion

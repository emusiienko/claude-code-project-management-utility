---
id: TC-058
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-058: Drag a Task Card to Change Status

## Preconditions

- App is running at `http://localhost:3000`
- At least one story has a task in the first status column
- The project has at least two `task_statuses` values

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story with at least one task
3. Note the source column name, its card count, and the target column name and its card count
4. Drag the task card from the source column and drop it onto the target column
5. Verify immediately after drop (optimistic update):
   - [ ] The card appears in the target column before any server response
   - [ ] The source column count decreases by 1
   - [ ] The target column count increases by 1
6. Wait for server confirmation (no spinner required — just that the card stays)
7. Verify:
    - [ ] The card remains in the target column (server confirmed, no rollback)
    - [ ] The aggregate counter has not changed (status change does not affect total_tasks)

## Expected Result

The task card moves to the target column and stays there. Column counts update immediately (optimistic). The aggregate counter is unaffected because the task count has not changed — only the status changed.

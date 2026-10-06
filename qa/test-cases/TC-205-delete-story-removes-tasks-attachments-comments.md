---
id: TC-205
tags: @regression
story: STORY-016 (FK enforcement)
status: Active
---

# TC-205: Deleting a story removes its tasks, links, attachments and comments (multi-level)

## Preconditions
- App is running at http://localhost:3100
- Story "FK-S1" with two tasks (one linked to a session), an attachment and a comment on the story, an attachment and a comment on a task
- Second story "FK-S2" with a task and an attachment

## Steps
1. Delete "FK-S1" (confirm).
2. Reload; look for "FK-S1" and its tasks on the list, board and Sessions view.
3. Check that the session formerly linked to the task still exists.
4. Open "FK-S2" and its task; download its attachment.

## Expected Result
- "FK-S1", its tasks, attachments and comments are gone everywhere after reload.
- The session still exists, with no link to the deleted task.
- "FK-S2" and its task, attachment are intact and the attachment downloads.

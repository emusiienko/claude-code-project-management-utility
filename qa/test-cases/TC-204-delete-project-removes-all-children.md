---
id: TC-204
tags: @smoke @regression
story: STORY-016 (FK enforcement)
status: Active
---

# TC-204: Deleting a project removes all its stories, tasks, sessions and attachments

## Preconditions
- App is running at http://localhost:3100
- Project "FK-Doomed" has: a story with two tasks, a session, a story attachment, a task attachment and a comment on the story
- Project "FK-Keeper" exists with one story, one task and one attachment

## Steps
1. Note the contents of both projects.
2. Delete "FK-Doomed" (confirm the dialog).
3. Open "FK-Keeper" and inspect its story, task, attachment.
4. Reload the app; open the Projects list and the Sessions view.
5. Create a new project named "FK-Doomed" again.

## Expected Result
- "FK-Doomed" is gone; no stories, tasks, sessions or attachments of it appear anywhere after reload.
- The recreated "FK-Doomed" is empty — nothing from the old one reappears.
- "FK-Keeper" and all its content, including its attachment download, are untouched.

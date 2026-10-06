---
id: TC-206
tags: @regression
story: STORY-016 (FK enforcement)
status: Active
---

# TC-206: Deleting a task removes its attachments and comments only

## Preconditions
- App is running at http://localhost:3100
- A story with Task A (one attachment, one comment) and Task B (one attachment, one comment); the story also has its own attachment and comment

## Steps
1. Delete Task A (confirm).
2. Reload; open the story.
3. Open Task B and the story's own attachments and comments.

## Expected Result
- Task A and its attachment and comment are gone.
- Task B, the story, and their attachments and comments are untouched; attachments download.

---
id: TC-132
tags: @regression
story: STORY-007
status: Active
---

# TC-132: Attachments add/view/delete behave consistently in the Task Detail Modal and Milestone Detail view

## Preconditions
- App is running at http://localhost:3000
- A project exists with a story, a task on that story, and a milestone
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for a task; in its Attachments section, click "Add attachment", create a document attachment (Write Markdown mode), and submit
2. In the same section, click View on the newly created row and confirm the Markdown viewer opens rendered
3. Delete the attachment via the confirmation dialog and confirm the row disappears and the count badge decrements
4. Navigate to the Milestone Detail page for a milestone; repeat steps 1–3 (add a document attachment, view it, delete it) in its Attachments section

## Expected Result
- In both the Task Detail Modal and the Milestone Detail view, creating a document attachment succeeds and the new row appears with correct type/kind badges, size, and timestamp
- In both hosts, the View action opens the same in-app Markdown viewer behavior seen in the Story slide-over
- In both hosts, Delete removes the attachment permanently via the confirmation dialog and the count badge decrements
- No behavioral difference is observed between the three hosts (Story slide-over, Task Detail Modal, Milestone Detail) for add/view/delete
- No console error occurs in either host during the sequence

---
id: TC-207
tags: @regression
story: STORY-016 (FK enforcement)
status: Active
---

# TC-207: Deleting a milestone removes its attachments and comments; its stories stay

## Preconditions
- App is running at http://localhost:3100
- Milestone "FK-M1" with an attachment, a comment, and two stories assigned
- Milestone "FK-M2" with an attachment

## Steps
1. Delete "FK-M1" (confirm).
2. Reload; check the milestones list and the two formerly assigned stories.
3. Open "FK-M2" and download its attachment.

## Expected Result
- "FK-M1", its attachment and comment are gone.
- The two stories still exist, now with no milestone.
- "FK-M2" and its attachment are intact.

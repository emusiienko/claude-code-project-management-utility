---
id: TC-017
tags: @smoke @regression
story: STORY-004
status: Active
---

# TC-017: Delete story — confirmation dialog and confirmed delete

## Preconditions
- App is running at http://localhost:3000
- At least one project exists with at least two stories
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. Note the title of the first story in the table (e.g. "Story to delete")
2. Click the Delete (trash) icon on that story's row
3. Verify: a confirmation dialog appears
4. Verify: the dialog displays the story's title ("Story to delete")
5. Verify: the dialog has a confirm (destructive) action button and a cancel button
6. Verify: the confirm button is visually distinct (red/danger styling)
7. Click the confirm button
8. Observe the result

## Expected Result
- Confirmation dialog opens on Delete icon click
- Dialog names the story being deleted
- Confirm button is styled as destructive (red/danger)
- After confirming, the dialog closes
- The story row is removed from the table without a full page reload
- The remaining stories are still listed correctly

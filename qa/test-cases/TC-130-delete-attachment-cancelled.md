---
id: TC-130
tags: @regression
story: STORY-007
status: Active
---

# TC-130: Cancelling the delete confirmation leaves the attachment intact

## Preconditions
- App is running at http://localhost:3000
- A story's Attachments section has at least one attachment

## Steps
1. Note the current attachment count badge
2. Click Delete on an attachment row
3. In the confirmation dialog, click Cancel (or dismiss the dialog without confirming)

## Expected Result
- The dialog closes without removing the attachment
- The row remains visible in the Attachments list, unchanged
- The count badge is unchanged

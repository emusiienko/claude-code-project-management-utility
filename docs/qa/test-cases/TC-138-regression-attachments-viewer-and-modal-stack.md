---
id: TC-138
tags: @smoke @regression
story: STORY-021
status: Active
---

# TC-138: Regression — Attachments viewer, download, delete, and modal-stack Escape behavior are unaffected

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over Attachments section has at least one Markdown document, one image, and one external-ref attachment (create if needed, using the new Title field)

## Steps
1. Click a Markdown document attachment row — verify the in-app viewer opens showing rendered content
2. Press Escape — verify the viewer closes and focus returns to the triggering row
3. Click an image attachment row — verify the lightbox opens
4. Press Escape — verify the lightbox closes
5. Click an external-ref attachment row — verify it opens the URL in a new tab
6. Download a document or image attachment — verify the file downloads correctly
7. Delete an attachment via the delete confirmation dialog — confirm the deletion
8. Attempt to delete another attachment but cancel the confirmation dialog — verify it remains intact

## Expected Result
- All viewer, download, and delete behaviors from the original Attachments feature (STORY-007) continue to work exactly as before — none of this was affected by the Type-to-Title change
- Escape correctly closes the topmost modal/viewer in the modal stack and returns focus without affecting parent modals (story slide-over stays open behind it)
- No new console errors or broken interactions are introduced by the Title field change

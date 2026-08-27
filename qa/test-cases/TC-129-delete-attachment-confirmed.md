---
id: TC-129
tags: @smoke @regression
story: STORY-007
status: Active
---

# TC-129: Delete an attachment via confirmation dialog — permanent removal

## Preconditions
- App is running at http://localhost:3000
- A story's Attachments section has at least two attachments of different kinds (e.g. one document, one external-ref)

## Steps
1. Note the current attachment count badge
2. Click Delete on the document attachment row
3. Observe the confirmation dialog; confirm the deletion
4. Repeat steps 1–3 for the external-ref attachment row

## Expected Result
- A confirmation dialog appears before either deletion completes, naming the attachment being removed
- On confirm, the row disappears from the list without a full page reload
- The count badge decrements by one after each deletion
- Deletion succeeds for both the document kind (stored-file kind) and the external-ref kind (no stored file) — delete works for every kind
- No error banner or console error appears during either deletion

---
id: TC-135
tags: @regression
story: STORY-021
status: Active
---

# TC-135: Clearing an auto-filled title (file-upload path) and submitting is rejected, not silently re-defaulted

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible

## Steps
1. Click "Add attachment"
2. Select kind "image" (or "document" upload-file mode) and choose a file — confirm the Title field auto-fills with the file name
3. Manually clear the Title field completely (select all, delete)
4. Attempt to submit the form

## Expected Result
- With Title cleared, submit is blocked (disabled button) or the submission is rejected with a clear "title is required" validation message
- The attachment is NOT silently created using the original file name as a fallback — the empty value is honored as empty, and the create does not succeed until the user re-types a title

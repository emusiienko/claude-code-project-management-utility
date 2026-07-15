---
id: TC-133
tags: @smoke @regression
story: STORY-021
status: Active
---

# TC-133: Title field auto-fills from file name for file-based attachment kinds (document-as-file, image, file)

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over (or Task Detail Modal / Milestone Detail) is open with the Attachments section visible

## Steps
1. Click "Add attachment"
2. Confirm there is no "Type" dropdown anywhere in the upload panel
3. Select kind "document", mode "Upload file", and choose a file (e.g. `report.md`) using a short file name
4. Observe the Title field immediately after the file is chosen
5. Edit the Title field to a different value before submitting
6. Submit the form
7. Repeat steps 3-6 for kind "image" (choose a PNG/JPEG file) and kind "file" (choose a binary file, e.g. `.docx` or `.zip`)
8. Repeat once more, but this time choose a file with a very long file name (200+ characters, extension included) and do not edit the Title field before submitting

## Expected Result
- No "Type" dropdown is present anywhere in the upload panel (removed entirely)
- For document (upload-file mode), image, and file kinds: as soon as a file is selected, the Title field auto-populates with the file's name (including extension)
- The Title field remains editable — typing a new value replaces the auto-filled one
- The value saved and shown in the new attachment row is whatever was in the Title field at submit time (the edited value, not the original file name), for the three kinds tested in step 3-7
- For the very-long-file-name case (step 8): the Title field auto-fills with a truncated version of the file name (no more than 500 characters), the upload does not fail, and the truncated title is what's saved and displayed on the new row

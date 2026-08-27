---
id: TC-115
tags: @regression
story: STORY-007
status: Active
---

# TC-115: Create a document attachment by uploading a .md/.txt file

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible
- A local `.md` (or `.txt`) file under 10 MB is available to select

## Steps
1. Click "Add attachment"
2. Keep kind as "document"; switch the mode toggle to "Upload file"
3. Select a Type from the dropdown
4. Use the file picker to select the local `.md`/`.txt` file
5. Submit the form

## Expected Result
- The file picker only offers `.md`/`.txt` files (or does not reject them if "all files" is selected)
- After submission, no error banner appears and the panel closes/resets
- A new row appears in the Attachments list with a "document" kind badge and the correct file size
- The row's file size roughly matches the selected file's size

---
id: TC-116
tags: @regression
story: STORY-007
status: Active
---

# TC-116: Create an image attachment (PNG/JPEG/GIF/WEBP)

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible
- A local PNG (or JPEG/GIF/WEBP) image file under 10 MB is available to select

## Steps
1. Click "Add attachment"
2. Switch kind to "image"
3. Select a Type from the dropdown
4. Use the file picker to select the local image file
5. Submit the form

## Expected Result
- No error banner appears; the panel closes/resets after submission
- A new row appears in the Attachments list with an "image" kind badge and the correct file size
- The row exposes a View action (in addition to Delete)

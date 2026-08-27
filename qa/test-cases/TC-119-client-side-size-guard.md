---
id: TC-119
tags: @regression
story: STORY-007
status: Active
---

# TC-119: Selecting a file over 10 MB shows an inline error before upload

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible
- A local file larger than 10 MB is available (e.g. a large image for the "image" kind, and a large PDF/ZIP for the "file" kind)

## Steps
1. Click "Add attachment"; switch kind to "image"
2. Select a Type from the dropdown
3. Use the file picker to select the oversized image file
4. Observe the panel without submitting
5. Repeat steps 1–4 with kind "file" and an oversized PDF/ZIP file

## Expected Result
- An inline error is shown near the file picker indicating the file is too large (e.g. "File must be smaller than 10 MB.") for both the image and file kinds
- The Submit button is disabled, or submitting does not send a request (no network call for the oversized file, no attachment row is created)
- No unhandled exception or blank screen occurs

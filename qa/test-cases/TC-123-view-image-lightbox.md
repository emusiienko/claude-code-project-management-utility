---
id: TC-123
tags: @regression
story: STORY-007
status: Active
---

# TC-123: Viewing an image attachment opens a lightbox

## Preconditions
- App is running at http://localhost:3000
- A story has an image attachment (PNG, JPEG, GIF, or WEBP)

## Steps
1. Click View on the image row
2. Observe the viewer that opens

## Expected Result
- A lightbox-style viewer opens showing the image at a readable size, centered, with the surrounding page dimmed
- The image is not distorted (correct aspect ratio) and scales to fit within the viewport without being clipped
- A close control is visible and closes the lightbox
- No console error appears while the lightbox is open

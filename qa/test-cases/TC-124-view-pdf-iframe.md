---
id: TC-124
tags: @regression
story: STORY-007
status: Active
---

# TC-124: Viewing a PDF file attachment opens an embedded viewer

## Preconditions
- App is running at http://localhost:3000
- A story has a "file" attachment with `mime_type: application/pdf`

## Steps
1. Click View on the PDF row
2. Observe the viewer that opens

## Expected Result
- A viewer modal opens with the PDF embedded inline (the browser's native PDF viewer inside an iframe) — not a forced download, not a blank frame
- The embedded PDF is scrollable/navigable using the browser's built-in PDF controls
- A close control is visible and closes the modal
- No console error appears while the viewer is open

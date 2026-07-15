---
id: TC-117
tags: @regression
story: STORY-007
status: Active
---

# TC-117: Create a file attachment (opaque binary kinds)

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible
- A local PDF file under 10 MB is available to select (repeat with a DOCX, XLSX, PPTX, CSV, TXT, JSON, or ZIP file for full coverage)

## Steps
1. Click "Add attachment"
2. Switch kind to "file"
3. Select a Type from the dropdown
4. Use the file picker to select the local PDF file
5. Submit the form
6. Repeat steps 1–5 with a DOCX, XLSX, PPTX, CSV, TXT, JSON, and ZIP file in turn

## Expected Result
- Each of the eight file types (PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP) is accepted without an error banner
- After each submission, a new row appears in the Attachments list with a "file" kind badge and the correct file size
- Each row exposes a View/Download action and a Delete action

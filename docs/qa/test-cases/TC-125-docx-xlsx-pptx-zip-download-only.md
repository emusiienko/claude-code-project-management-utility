---
id: TC-125
tags: @regression
story: STORY-007
status: Active
---

# TC-125: DOCX, XLSX, PPTX, and ZIP attachments offer download only, no in-app viewer

## Preconditions
- App is running at http://localhost:3000
- A story has four "file" attachments: one DOCX, one XLSX, one PPTX, and one ZIP

## Steps
1. Locate the DOCX row; observe its available row action(s)
2. Trigger the row's action
3. Repeat for the XLSX, PPTX, and ZIP rows

## Expected Result
- None of the four rows offers a "View" action that opens an in-app viewer modal
- Each row's action triggers a file download (or clearly labeled "Download") instead of opening a modal
- No blank or broken viewer modal ever opens for these four types
- No console error occurs when triggering the download action

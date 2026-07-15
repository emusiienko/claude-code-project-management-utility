---
id: TC-128
tags: @regression
story: STORY-007
status: Active
---

# TC-128: Downloading a document/image/file attachment retrieves the stored content

## Preconditions
- App is running at http://localhost:3000
- A story has one document, one image, and one file (e.g. PDF) attachment

## Steps
1. Trigger the Download action on the document row
2. Trigger the Download action on the image row
3. Trigger the Download action on the file (PDF) row

## Expected Result
- Each download completes without an error banner or console error
- Each downloaded file's content type matches the attachment's kind (e.g. the PDF download is a valid PDF, the image download opens as a valid image)
- No download is triggered for the external-ref kind's row in place of opening its URL (see external-ref behavior)

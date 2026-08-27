---
id: TC-120
tags: @regression
story: STORY-007
status: Active
---

# TC-120: Author role is optional on every kind and displayed once set

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible

## Steps
1. Click "Add attachment"; create a document attachment (Write Markdown mode) leaving the Author role field blank; submit
2. Click "Add attachment" again; create a second document attachment, this time entering an Author role (e.g. "backend-developer"); submit
3. Compare the two new rows in the Attachments list

## Expected Result
- Both attachments are created successfully; the Author role field never blocks submission when left blank
- The first row (blank author role) shows no author information, or a neutral placeholder — no error, no "null" or "undefined" text leaking into the UI
- The second row displays the entered author role text
- The upload panel accepts the Author role field regardless of which kind is selected (document/image/file/external-ref)

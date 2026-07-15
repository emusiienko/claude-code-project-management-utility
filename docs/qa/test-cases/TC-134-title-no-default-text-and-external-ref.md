---
id: TC-134
tags: @smoke @regression
story: STORY-021
status: Active
---

# TC-134: Title has no default value for document-as-text and external-ref kinds, and is required

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible

## Steps
1. Click "Add attachment"
2. Select kind "document" and mode "Write Markdown" (no file upload)
3. Observe the Title field before typing anything
4. Type some Markdown text into the content textarea but leave Title empty, then attempt to submit
5. Fill in a Title value and submit
6. Repeat steps 2-5 for kind "external-ref" (enter a URL, leave Title empty then attempt submit, then fill Title and submit)

## Expected Result
- For document-as-text and external-ref: the Title field starts empty — no default value is pre-filled (unlike the file-upload kinds)
- Attempting to submit with Title empty is blocked or rejected: submit is disabled while Title is empty, or a clear field-level validation message appears and no attachment is created
- Once Title is filled in, submission succeeds and the new row displays the entered Title

---
id: TC-114
tags: @smoke @regression
story: STORY-007
status: Active
---

# TC-114: Create a document attachment by writing Markdown, and verify display

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible
- The project's effective `attachment_types` dictionary contains at least one entry

## Steps
1. Click "Add attachment"
2. Leave kind as "document" and mode as "Write Markdown"
3. Select a Type from the dropdown
4. Enter some Markdown text in the textarea (e.g. `# Heading` and a paragraph)
5. Optionally enter an Author role
6. Submit the form

## Expected Result
- The upload panel closes (or resets) after submission, with no error banner
- The Attachments list refreshes without a full page reload and the count badge increments by one
- A new row appears showing: the selected type badge, a "document" kind badge, the file size in bytes, and a created timestamp
- If an Author role was entered, it is reflected wherever the row displays author information
- No error message or lingering spinner remains visible after the operation

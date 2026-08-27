---
id: TC-118
tags: @regression
story: STORY-007
status: Active
---

# TC-118: Create an external-reference attachment

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible

## Steps
1. Click "Add attachment"
2. Switch kind to "external-ref"
3. Select a Type from the dropdown
4. Enter a URL (e.g. `https://example.com/design-doc`)
5. Optionally enter an external status (e.g. "draft")
6. Submit the form

## Expected Result
- No error banner appears; the panel closes/resets after submission
- A new row appears in the Attachments list with an "external-ref" kind badge, showing the URL (no file size, since external-ref has no stored file)
- The row exposes an "open link" action instead of a Delete-adjacent View/Download action
- Submitting with the URL field left empty shows an inline "required" validation error and does not submit

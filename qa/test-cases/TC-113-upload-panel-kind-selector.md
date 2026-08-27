---
id: TC-113
tags: @regression
story: STORY-007
status: Active
---

# TC-113: Attachment Upload Panel — kind selector switches the visible fields

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Attachments section visible
- Browser viewport set to 1280px wide

## Steps
1. Click "Add attachment" to open the upload panel
2. Observe the fields shown with the "document" kind selected (the default)
3. Switch the kind selector to "image"; observe the fields
4. Switch the kind selector to "file"; observe the fields
5. Switch the kind selector to "external-ref"; observe the fields

## Expected Result
- A kind selector (radio group or segmented control) with four options is visible: document, image, file, external-ref
- **document**: a mode toggle ("Write Markdown" / "Upload file") is shown; the textarea is shown by default; switching to "Upload file" shows a file picker instead
- **image**: a file picker is shown (no mode toggle, no textarea)
- **file**: a file picker is shown (no mode toggle, no textarea)
- **external-ref**: a URL text input (required) and an optional external status text input are shown; no file picker
- In every kind, a Type dropdown, an optional Author role text input, and a Submit button remain visible
- Switching kinds does not retain stale values from a previously selected kind's now-hidden fields
- No layout shift or overflow occurs when switching between kinds

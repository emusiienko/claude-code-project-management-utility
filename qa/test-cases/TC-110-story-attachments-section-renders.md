---
id: TC-110
tags: @smoke @regression
story: STORY-007
status: Active
---

# TC-110: Story slide-over — Attachments section renders correctly

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one story
- Browser viewport set to 1280px wide

## Steps
1. Navigate to a project's Stories screen
2. Click on a story row to open the Story slide-over
3. Scroll the right panel to the "Attachments" section (below Links, above Comments)

## Expected Result
- A heading labeled "Attachments" is visible, with a count badge showing the current number of attachments
- An "Add attachment" control is visible within the section
- When no attachments exist, an empty state is shown (placeholder text — no error, no spinner)
- When attachments exist, each row shows: a type badge, a kind badge, a name or URL, a file size (for document/image/file kinds), and a created timestamp
- Each row exposes View/Download and Delete actions (external-ref rows expose an "open link" action instead of View)
- The section does not overflow its container; no horizontal scrollbar appears within the slide-over
- No "Something went wrong" overlay or console error while the section loads

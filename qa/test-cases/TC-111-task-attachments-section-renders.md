---
id: TC-111
tags: @smoke @regression
story: STORY-007
status: Active
---

# TC-111: Task Detail Modal — Attachments section renders correctly

## Preconditions
- App is running at http://localhost:3000
- A project exists with a story containing at least one task
- Browser viewport set to 1280px wide

## Steps
1. Open a story's slide-over, then click a task card to open the Task Detail Modal
2. Scroll the modal body to the "Attachments" section (below Links, above Comments)

## Expected Result
- A heading labeled "Attachments" is visible, with a count badge
- An "Add attachment" control is visible
- Empty state shown when the task has no attachments (no error, no spinner)
- Populated rows show the same fields as the Story slide-over (type badge, kind badge, name/URL, file size, created timestamp) with View/Download and Delete actions
- The section stays within the modal's scrollable body; no horizontal scrollbar appears
- No "Something went wrong" overlay or console error while the section loads

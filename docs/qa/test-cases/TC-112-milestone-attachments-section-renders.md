---
id: TC-112
tags: @smoke @regression
story: STORY-007
status: Active
---

# TC-112: Milestone Detail — Attachments section renders correctly

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one milestone
- Browser viewport set to 1280px wide

## Steps
1. Navigate to a project's Milestones screen
2. Click a milestone's name to open its Milestone Detail page (`/milestones/:id`)
3. Scroll to the "Attachments" section (below Stories; a "Comments" placeholder remains beneath it pending STORY-008)

## Expected Result
- A heading labeled "Attachments" is visible, with a count badge
- An "Add attachment" control is visible
- Empty state shown when the milestone has no attachments (no error, no spinner)
- Populated rows show the same fields as the Story slide-over (type badge, kind badge, name/URL, file size, created timestamp) with View/Download and Delete actions
- The section does not overflow the page; no horizontal scrollbar appears
- No "Something went wrong" overlay or console error while the section loads

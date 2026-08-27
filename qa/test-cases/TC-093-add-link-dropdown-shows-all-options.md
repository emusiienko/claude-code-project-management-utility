---
id: TC-093
tags: @regression
story: STORY-019
status: Active
---

# TC-093: Add Link dropdown shows all 6 directional options for known link types

## Preconditions
- App is running at http://localhost:3000
- A project exists with `link_types` dictionary containing exactly the keys `depends-on`, `created-by`, and `context`
- A story with at least two tasks exists in the project
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for any task (Task A)
2. Click "Add link" to open the Add link form
3. Open the link type / direction dropdown
4. Count and read all options listed
5. Close the task modal
6. Open a story's slide-over
7. Click "Add link" in the Links section
8. Open the link type / direction dropdown in the story Add link form
9. Count and read all options listed

## Expected Result
- The task Add link form dropdown shows exactly 6 options:
  - "depends on" (outbound for `depends-on`)
  - "dependent" (inbound for `depends-on`)
  - "created by" (outbound for `created-by`)
  - "creates" (inbound for `created-by`)
  - "context" (outbound for `context`)
  - "context for" (inbound for `context`)
- The story Add link form dropdown shows the same 6 options in the same order
- No raw dictionary key slugs (e.g. "depends-on") are visible in either dropdown
- The dropdown is scrollable if needed — no options are clipped or hidden

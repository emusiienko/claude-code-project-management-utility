---
id: TC-026
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-026: /projects — full-page management, no sidebar, no sub-nav

## Preconditions
App is running.

## Steps
1. Navigate to http://localhost:3000/projects.
2. Verify no sidebar is rendered.
3. Verify no sub-nav bar is rendered.
4. Verify the page shows a project table with Name, Description, and Actions columns.
5. Verify "New project" button is present.
6. Verify project edit and delete actions work (open modal / confirmation dialog).

## Expected Result
- /projects renders without sidebar and without sub-nav.
- Project list table is visible with full-width layout.
- CRUD actions (create, edit, delete) are accessible.

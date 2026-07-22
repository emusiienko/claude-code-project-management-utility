---
id: TC-026
tags: @smoke @regression
story: STORY-016
status: Inactive — superseded by STORY-022, the `/projects` full-page route was removed; project management is now a global slide-over overlay (no dedicated URL), covered by its own dedicated test cases
---

# TC-026: /projects — full-page management, no sidebar, no sub-nav

> Retired 2026-07-22 (STORY-022 reconcile): the `/projects` route no longer exists — Revision 3 of STORY-022 removed the `/projects`, `/settings`, and `/projects/:id/settings` route entries entirely in favor of a state-driven overlay with no dedicated URL. The project list, its CRUD actions, and the "no sidebar / no sub-nav" framing this TC checked now live inside the Projects overlay panel, which is opened from the global top-bar entry and always renders over a mounted main view. Kept for historical reference only; do not execute.

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

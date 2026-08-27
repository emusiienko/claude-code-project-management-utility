---
id: TC-031
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-031: Project Settings (via Projects overlay) — project dictionary overrides

> Updated 2026-07-22 (STORY-022 reconcile): the `/projects/:id/settings` route (and its sub-nav Settings tab) no longer exists. Project-level dictionary overrides are now reached by opening the global "Projects" overlay and clicking a project's name — this pushes a second level onto the same overlay showing that project's Settings, with a "Back" control returning to the project list and an "Open in Task Manager" action that dismisses the overlay and navigates to the project's Stories view.

## Preconditions
App is running. At least one project exists.

## Steps
1. Click the "Projects" button in the top bar to open the Projects overlay (project list).
2. Click a project's name in the list.
3. Verify the overlay advances to a second level showing that project's name and its dictionary override cards, with a "Back" control in the overlay header, and the URL does not change.
4. Verify the page shows "Override dictionary values for this project" copy with dictionary override cards — this is the project-level override view, not the System Settings view.
5. Verify the underlying main view (sidebar, sub-nav, current screen) stays mounted and dimmed underneath the overlay.
6. Click the Edit (pencil) icon on a dictionary card. Verify the edit mode opens.
7. Cancel the edit.
8. Click "Back". Verify the overlay returns to the Projects list (first level).
9. Click the project's name again, then click "Open in Task Manager". Verify the overlay dismisses and the main view navigates to that project's Stories view (Stories/Board/Milestones sub-navigation available).

## Expected Result
- Project dictionary overrides are reached via the Projects overlay (click a project's name), not a `/projects/:id/settings` URL — the URL never changes while browsing the overlay.
- The Settings level shows project-level dictionary overrides (not system defaults), with "Back" returning to the project list.
- Override edit functionality works as before (from STORY-002).
- "Open in Task Manager" dismisses the overlay and navigates to the project's Stories view in the same step.

---
id: TC-175
tags: @smoke @regression
story: STORY-009
status: Active
---

# TC-175: Sessions mode — top-level app-switcher entry, own project-selector sidebar, project switch re-scopes the session list

## Preconditions
- App is running at http://localhost:3000
- At least two projects exist, each with at least one session
- Viewport at 1280px (desktop)

## Steps
1. From Task Manager mode, open the app-switcher and select "Sessions".
2. Confirm the app navigates to a distinct Sessions mode — not a sub-nav tab inside a project (no Stories/Board/Milestones/Settings tabs visible).
3. Confirm Sessions mode shows its own left-placed project-selector sidebar (a project list), structurally mirroring Task Manager's sidebar.
4. Confirm no project-scoped session list is shown until a project is selected (or the last-visited project auto-selects, consistent with Task Manager's root-redirect behavior).
5. Select "Project A" in the sidebar. Confirm the main view shows Project A's sessions only.
6. Select "Project B" in the sidebar. Confirm the main view re-scopes to Project B's sessions only — Project A's sessions are no longer shown.
7. Open the app-switcher again and confirm "Sessions" shows a current-mode indication while in Sessions mode, and switching to Task Manager returns to the previously active project's Stories view.

## Expected Result
- Sessions is reachable as its own top-level app-switcher mode, structurally parallel to Task Manager (own project-selector sidebar, no project sub-nav tabs).
- Selecting a different project in the Sessions sidebar re-scopes the session list to that project only — no cross-project session list is ever shown.
- Mode switching works both ways without error.

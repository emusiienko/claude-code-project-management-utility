---
id: TC-024
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-024: Collapsible sidebar

> Updated 2026-07-22 (STORY-022 reconcile): the sidebar's "Gestisci progetti" / "Manage projects" link is removed — project management is now reached exclusively via the global "Projects" entry in the top bar. This TC drops the former steps 9–10 (link click → navigate to `/projects`) and its removal is asserted directly instead. The remaining sidebar behaviors (combobox, project list, collapse/expand persistence) are unaffected and still apply.

## Preconditions
App is running. At least one project exists.

## Steps
1. Navigate to /projects/:id/stories for an existing project.
2. Verify the sidebar is visible with: project combobox at top, project list, active project highlighted — and no "Manage projects" (or "⚙ Gestisci progetti") link anywhere in the sidebar.
3. Click the collapse toggle button (◄).
4. Verify the sidebar collapses — only the toggle button remains visible, main content fills full width.
5. Reload the page.
6. Verify the sidebar remains collapsed (localStorage persists state).
7. Click the expand toggle button (▶).
8. Verify the sidebar expands and shows all elements again, still with no "Manage projects" link.

## Expected Result
- Sidebar shows project combobox and project list with active project highlighted — no "Manage projects" link is present.
- Collapse toggle hides the sidebar content leaving only the toggle visible.
- State persists in localStorage (key: app:sidebar_collapsed).
- Project management is reached only via the global "Projects" top-bar entry, not from the sidebar.

---
id: TC-024
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-024: Collapsible sidebar

## Preconditions
App is running. At least one project exists.

## Steps
1. Navigate to /projects/:id/stories for an existing project.
2. Verify the sidebar is visible with: project combobox at top, project list, active project highlighted, "Gestisci progetti" link at bottom.
3. Click the collapse toggle button (◄).
4. Verify the sidebar collapses — only the toggle button remains visible, main content fills full width.
5. Reload the page.
6. Verify the sidebar remains collapsed (localStorage persists state).
7. Click the expand toggle button (▶).
8. Verify the sidebar expands and shows all elements again.
9. Click "Gestisci progetti" link.
10. Verify navigation goes to /projects.

## Expected Result
- Sidebar shows project combobox, project list with active project highlighted, and "Gestisci progetti" link.
- Collapse toggle hides the sidebar content leaving only the toggle visible.
- State persists in localStorage (key: app:sidebar_collapsed).
- "Gestisci progetti" navigates to /projects.

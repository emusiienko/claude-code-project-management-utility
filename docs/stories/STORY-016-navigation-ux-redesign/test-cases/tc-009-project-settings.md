---
id: tc-009
tags: @smoke @regression
story: STORY-016
status: Active
---

# tc-009: /projects/:id/settings — project dictionary overrides

## Preconditions
App is running. At least one project exists.

## Steps
1. Navigate to /projects/:id/settings.
2. Verify the sidebar is visible with the active project highlighted.
3. Verify the sub-nav Settings tab is highlighted.
4. Verify the page shows "Project Settings" with six dictionary override cards.
5. Verify the page does NOT show system defaults (this is the project-level override view).
6. Click the Edit (pencil) icon on a dictionary card. Verify the edit mode opens.
7. Cancel the edit.

## Expected Result
- /projects/:id/settings shows project-level dictionary overrides.
- Sidebar and sub-nav are rendered (Settings tab active).
- Override edit functionality works as before (from STORY-002).

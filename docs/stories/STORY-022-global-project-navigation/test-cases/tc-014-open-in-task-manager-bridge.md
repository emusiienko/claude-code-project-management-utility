---
id: tc-014
tags: @smoke @regression
story: STORY-022
status: Active
---

# tc-014: "Open in Task Manager" bridge resolves BUG-006 for a project not yet opened this session

## Preconditions
- App is running at http://localhost:3000
- At least two projects exist
- A fresh session/browser state (or `localStorage` cleared) so no project has been opened in Task Manager mode yet this session

## Steps
1. From Sessions mode (or any Task Manager view for a *different* project), open the Projects overlay.
2. Select a project you have not opened in Task Manager mode this session.
3. On its Settings panel, verify an "Open in Task Manager" button is present, and verify no sub-navigation tab bar (Stories/Board/Milestones) has been added to the Settings panel itself.
4. Click "Open in Task Manager".
5. Verify: the main view navigates to that exact project's Stories view, the overlay is dismissed in the same action, and the three-tab sub-navigation (Stories/Board/Milestones) is present and all three tabs load normally.
6. Repeat from a Task Manager view for a different project (not just from Sessions), to confirm the bridge works regardless of the main view's prior state.

## Expected Result
- "Open in Task Manager" provides a direct, single-click path from any project's Settings panel into that same project's Stories/Board/Milestones, with no dependence on any previously recorded project or URL — resolving BUG-006 (originally: no in-app path existed from a project's Settings screen to its own Stories for a project not yet opened in Task Manager mode).
- No sub-navigation tab bar is added to the Settings panel itself; the single forward button is the resolution, not a tab bar.

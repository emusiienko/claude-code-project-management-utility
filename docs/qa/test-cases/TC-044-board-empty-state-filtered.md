---
id: TC-044
tags: @regression
story: STORY-012
status: Active
---

# TC-044: Board — empty state when active milestone has no stories assigned

## Preconditions
- App is running at http://localhost:3000.
- A project exists with an "Active" milestone (e.g. "Empty Sprint").
- No stories in the project are assigned to "Empty Sprint" (the milestone exists but is empty).

## Steps
1. Navigate to the Board view for the project (/projects/:id/board).
2. Observe the board content area.
3. Verify the board shows an empty state (no story cards visible in any column).
4. Verify the empty state includes a prompt suggesting the user assign stories to the milestone or use the "show all" toggle.
5. Verify the filter indicator showing "Empty Sprint" is still visible.
6. Click the "show all" toggle from the empty state area or the filter indicator.
7. Verify all project stories are now displayed on the board.

## Expected Result
- When the active milestone has no assigned stories, the Board shows an empty state with a helpful prompt.
- The filter indicator remains visible so the user knows why the board is empty.
- The "show all" toggle is accessible from the empty state and reveals all project stories.

---
id: TC-194
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-194: Resize the Story Detail task board / right-panel split via drag

## Preconditions
- App is running at http://localhost:3100
- A project has at least one story with at least one task, so the Story Detail task board is populated
- Viewport at 1280px (desktop)

## Steps
1. Open a Story Detail slide-over for a story with at least one task.
2. Verify the task kanban board is on the left/main area and the right-hand panel (DESCRIPTION, ATTACHMENTS, COMMENTS) is on the right, with a border between them.
3. Move the cursor over that border without clicking. Verify a resize affordance appears before any drag begins.
4. Press and hold the mouse button on the border, then drag it to the left by ~100px, moving in several increments.
5. Verify the right-hand panel widens continuously as the cursor moves and the task board narrows to match.
6. Release the mouse button. Verify the width holds exactly at the release point.
7. Drag the border to the right by ~100px and release. Verify the task board widens and the right-hand panel narrows, holding at the release point.
8. Verify the existing right-panel collapse toggle (‹) still collapses and expands the panel correctly, independent of the new drag-resize behavior.

## Expected Result
Hovering the border between the task board and the right-hand panel shows a resize affordance. Dragging changes both areas' widths continuously in both directions, holding exactly at the release point. The pre-existing collapse toggle keeps working unaffected.

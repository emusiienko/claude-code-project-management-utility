---
id: TC-192
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-192: Resize the project navigation sidebar via drag

## Preconditions
- App is running at http://localhost:3100 (dev stack)
- At least one project exists with at least one story, so the Task Manager sidebar is populated
- Viewport at 1280px (desktop)

## Steps
1. Navigate to a Task Manager view showing the project navigation sidebar (e.g. `/projects/:id/stories`).
2. Move the cursor over the border between the sidebar and the main content, without clicking.
3. Verify a resize affordance appears (e.g. the cursor changes to a resize/col-resize indicator) before any drag begins.
4. Press and hold the mouse button on the border, then drag it to the right by ~100px, moving in several increments.
5. Verify the sidebar's width increases continuously as the cursor moves (not only on release) and the main content area narrows to match.
6. Release the mouse button.
7. Verify the width stops changing exactly at the released position — no further movement, no snap to a different value.
8. Drag the border to the left by ~100px from its current position and release.
9. Verify the sidebar narrows and the main content widens accordingly, then holds at the release point.
10. If the sidebar has an existing collapse/expand toggle, verify it still collapses and expands the sidebar correctly (no regression from the new drag behavior).

## Expected Result
Hovering the border shows a resize affordance before dragging. Dragging changes the sidebar and main content widths continuously and smoothly in both directions, and the width holds exactly where released. The pre-existing collapse/expand toggle (if present) keeps working unaffected.

---
id: TC-193
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-193: Resize the sessions navigation sidebar via drag

## Preconditions
- App is running at http://localhost:3100
- At least one project exists with at least one session, so the Sessions sidebar and content are populated
- Viewport at 1280px (desktop)

## Steps
1. Switch to Sessions mode via the app-switcher.
2. Move the cursor over the border between the sessions project-selector sidebar and the Sessions content area, without clicking.
3. Verify a resize affordance appears before any drag begins.
4. Press and hold the mouse button on the border, then drag it to the right by ~100px, moving in several increments.
5. Verify the sidebar's width increases continuously as the cursor moves and the Sessions content area narrows to match.
6. Release the mouse button. Verify the width holds exactly at the release point.
7. Drag the border to the left by ~100px and release. Verify the sidebar narrows and the content widens, holding at the release point.
8. Switch to Task Manager mode, then back to Sessions mode.
9. Verify the sessions sidebar's resized width is still what was last set (still within the same browser session) — this anticipates the persistence checks in TC-196, but confirms the mode switch itself does not reset it.

## Expected Result
Hovering the border between the sessions sidebar and content shows a resize affordance. Dragging changes both panels' widths continuously in both directions, holding exactly at the release point. Switching modes and back does not reset the resized width.

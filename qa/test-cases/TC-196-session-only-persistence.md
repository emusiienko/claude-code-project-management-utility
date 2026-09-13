---
id: TC-196
tags: @regression
story: STORY-006
status: Active
---

# TC-196: Resized width holds for the browser session only — survives in-session navigation, resets on reload

## Preconditions
- App is running at http://localhost:3100
- At least one project exists with at least one story containing a task

## Steps
For each of the three panel pairs (project navigation sidebar, sessions navigation sidebar, Story Detail task board/right-panel split):
1. Note the pair's default width.
2. Drag its border to a noticeably different width and release.
3. Navigate away from that view (e.g. to a different screen/mode) and back to it, without reloading the page.
4. Verify the pair still shows the resized width from step 2 (not the default).
5. Reload the browser page (full page reload).
6. Verify the pair has returned to its default width from step 1 — the resize did not survive the reload.

## Expected Result
For every panel pair, the resized width is preserved while navigating within the same browser session (no reload), and is discarded on a full page reload, returning to that pair's default width.

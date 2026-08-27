---
id: TC-172
tags: @regression
story: STORY-022
status: Active
---

# TC-172: Back vs Dismiss — distinct stack-pop vs full-close behavior on both overlays

## Preconditions
- App is running at http://localhost:3000
- At least one project exists

## Steps
1. Open the Projects overlay. Verify no "Back" control is present at the root (project list) level.
2. Select a project (pushes the Settings level). Verify "Back" now appears alongside "Dismiss".
3. Click "Back". Verify the panel returns to the project list (root), stays open, and no "Back" control is shown at root again.
4. Select a project again to push the Settings level. This time click "Dismiss" instead of "Back". Verify the entire overlay closes in one action (not just one level), revealing the main view.
5. Open the Config overlay (single-level stack). Verify "Back" never appears at any point, since Config has no depth beyond its root — only "Dismiss" is available.
6. Click the dimmed backdrop (outside the panel) while either overlay is open at any stack depth. Verify it also fully closes the overlay (backdrop click behaves like Dismiss, not Back).

## Expected Result
- "Back" pops exactly one internal level and only appears when the stack has depth beyond its root.
- "Dismiss" (and the backdrop click) always clears the whole stack in one action, from any level.
- Config, having only one level, never shows "Back".

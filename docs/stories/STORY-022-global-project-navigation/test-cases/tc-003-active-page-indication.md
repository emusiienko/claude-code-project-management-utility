---
id: tc-003
tags: @regression
story: STORY-022
status: Active
---

# tc-003: Global Projects/Config entries — open/active indication driven by overlay state

## Preconditions
- App is running at http://localhost:3000
- Viewport at 1280px (desktop)

## Steps
1. From any main view, click "Projects". Verify the "Projects" entry shows an active indication (`aria-current="page"` + highlighted style) while its overlay is open — check via both visual style and the `aria-current` attribute, since it is not always reflected identically in every accessibility-tree snapshot.
2. Push the Projects overlay to its Settings level (select a project). Verify "Projects" still shows the active indication (the indication tracks overlay-open state, not stack depth).
3. Dismiss the panel. Verify the active indication is removed from "Projects".
4. Repeat steps 1–3 for "Config".
5. Confirm only one of the two entries is ever active at a time (opening one overlay does not mark the other active).

## Expected Result
- Each top-bar entry shows a clear active indication exactly while its own overlay is open, at any stack depth, and loses it immediately on Dismiss/Back-to-closed.
- The indication is driven by overlay state, not by route matching (the underlying route never changes when the overlay opens/closes).

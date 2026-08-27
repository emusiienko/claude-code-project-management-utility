---
id: TC-163
tags: @regression
story: STORY-022
status: Active
---

# TC-163: Global Projects/Config entries and their panels — keyboard accessibility

## Preconditions
- App is running at http://localhost:3000
- Viewport at 1280px (desktop)

## Steps
1. Navigate to `/projects/:id/stories` for an existing project.
2. Click into the page body, then press Tab repeatedly until keyboard focus reaches the "Projects" entry in the top bar (it is a `<button>`, not a link, but is still natively focusable).
3. Verify a visible focus indicator (ring/outline) appears, consistent with the styling of the "Config" entry beside it.
4. With focus on "Projects", press Enter (or Space). Verify the overlay opens.
5. Tab into the panel — verify "Dismiss" is focusable with a visible focus ring, and (once a project is selected, pushing the Settings level) "Back" is also focusable with a visible ring.
6. With focus on "Dismiss", press Enter — verify the panel closes.
7. Press Escape while the panel is open — verify it closes one level per press (Back-equivalent when the stack has depth, Dismiss-equivalent at the root).

## Expected Result
- Both top-bar entries are keyboard-reachable and show a visible focus ring, matching each other's styling.
- The panel's own controls (Back, Dismiss) are keyboard-operable with visible focus rings.
- Escape closes exactly one overlay level per press.

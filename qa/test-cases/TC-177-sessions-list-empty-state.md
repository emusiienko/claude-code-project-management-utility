---
id: TC-177
tags: @smoke @regression
story: STORY-009
status: Active
---

# TC-177: Sessions list — empty state ("No sessions yet") when active project has no sessions

## Preconditions
- App is running at http://localhost:3000
- A project exists with zero sessions
- Viewport at 1280px (desktop)

## Steps
1. In Sessions mode, select the project with zero sessions.
2. Observe the main view.
3. Confirm no error, spinner-forever, or blank white area is shown instead.

## Expected Result
- An explicit empty state message ("No sessions yet" or equivalent copy) is shown — not an error state and not a blank screen.
- The "Create session" entry point is still visible/reachable from the empty state.

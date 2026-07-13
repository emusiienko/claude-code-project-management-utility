---
id: TC-102
tags: @regression
story: STORY-020
status: Active
---

# TC-102: Removing a link_types entry works correctly

## Preconditions

- App is running at http://localhost:3000
- System Settings page is open at `/settings`
- At least two `link_types` entries exist
- Viewport: 1280px

## Steps

1. Navigate to `/settings`, scroll to the `link_types` section
2. Identify the first entry (e.g. `creates`)
3. Click the Remove/Delete button for that entry
4. Confirm deletion if a confirmation dialog appears
5. Click Save (if removal is staged before save)
6. Observe the result

## Expected Result

- The removed entry disappears from the list
- Remaining entries are still displayed correctly with all three fields intact
- No error message is shown after removal
- Refreshing the page confirms the entry is gone
- The page does not crash

## Cleanup

- Restore the removed entry if the test environment is shared

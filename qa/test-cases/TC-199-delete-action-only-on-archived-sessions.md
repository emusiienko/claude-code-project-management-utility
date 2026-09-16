---
id: TC-199
tags: @smoke @regression
story: STORY-008
status: Active
---

# TC-199: Delete action is available only on archived sessions — list row and Session Detail

## Preconditions
- App is running at http://localhost:3100
- Two sessions exist in the active project: Session A (not archived) and Session B (archived)
- Viewport at 1280px (desktop)

## Steps
### Part A — Sessions list
1. Locate Session A's row (not archived). Check its row-level actions/context menu for a delete action.
2. Toggle "include archived" on so Session B's row is visible. Locate Session B's row (archived). Check its row-level actions/context menu for a delete action.

### Part B — Session Detail
3. Open Session A's Detail view. Check the view for any delete action (button, menu item, icon).
4. Open Session B's Detail view. Check the view for any delete action.

## Expected Result
- Session A (not archived) has no delete action anywhere — not in its list row and not in its Detail view.
- Session B (archived) has a delete action available both from its list row and from its Detail view.
- No other control on Session A's row or Detail view (e.g. the archive action) doubles as a way to delete it.

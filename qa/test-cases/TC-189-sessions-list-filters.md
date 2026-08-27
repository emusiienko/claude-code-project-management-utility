---
id: TC-189
tags: @regression
story: STORY-009
status: Active
---

# TC-189: Sessions list — "incomplete only" and "linked to story" filters, independently combinable

## Preconditions
- App is running at http://localhost:3000
- The active project has: at least one complete session linked to Story X, at least one incomplete session linked to Story X, at least one incomplete session linked to a different story or unlinked, and at least one complete session unlinked
- Viewport at 1280px (desktop)

## Steps
1. Apply the "incomplete only" filter alone. Confirm only incomplete sessions are shown, regardless of link.
2. Clear that filter. Apply the "linked to Story X" filter alone. Confirm only sessions linked to Story X are shown, regardless of completion state.
3. Apply both filters together ("incomplete only" + "linked to Story X"). Confirm only the incomplete session(s) linked to Story X are shown — the complete one linked to Story X is excluded, and incomplete sessions linked elsewhere are excluded.
4. Clear both filters. Confirm the full unfiltered list returns.

## Expected Result
- Each filter works correctly in isolation.
- Both filters are combinable and narrow the list to the intersection, not a superset.
- Clearing filters restores the full list.

---
id: TC-062
tags: @regression
story: STORY-005
status: Active
---

# TC-062: Filter Bar Dims Non-Matching Cards Without API Calls

## Preconditions

- App is running at `http://localhost:3000`
- A story has at least three tasks; at least two have different types (e.g. "bug" and "feature")

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for the story
3. Observe all task cards are fully visible (no dimming)
4. Open the browser's Network tab (secondary tool — observe only, do not interact with)
5. In the filter bar above the Kanban, open the "type" dropdown
6. Select a type value that matches only some tasks (e.g. "bug")
7. Verify immediately:
   - [ ] Cards whose type matches the filter are fully visible and opaque
   - [ ] Cards whose type does NOT match are visually dimmed (reduced opacity or greyed out)
   - [ ] No columns are hidden or removed — all columns remain in place
   - [ ] The column header count still shows the total cards in that column (not filtered count)
8. Observe the Network tab — verify no new XHR/Fetch requests to the tasks API are fired when the filter is applied
9. Reset the filter (clear the type dropdown selection)
10. Verify all cards return to full opacity

## Expected Result

Applying a filter type from the filter bar dims non-matching cards client-side without removing columns or issuing new API calls. Clearing the filter restores all cards to full opacity.

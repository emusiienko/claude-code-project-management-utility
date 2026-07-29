---
id: tc-016
tags: @regression
story: STORY-009
status: Active
---

# tc-016: Sessions list — pagination

## Preconditions
- App is running at http://localhost:3000
- The active project has enough sessions to span at least two pages at the app's default page size
- Viewport at 1280px (desktop)

## Steps
1. Open the Sessions list for the project with many sessions.
2. Confirm pagination controls (next/previous or page numbers) are visible and functional.
3. Navigate to the next page. Confirm a different set of sessions is shown, with no duplicates from the first page.
4. Navigate back to the previous page. Confirm the original first-page set is shown again.
5. Apply a filter (e.g. "incomplete only") and confirm pagination re-paginates correctly over the filtered result set.

## Expected Result
- Pagination controls work correctly, show distinct pages of sessions, and interact correctly with active filters.
- No layout break or duplicate/missing rows across page navigation.

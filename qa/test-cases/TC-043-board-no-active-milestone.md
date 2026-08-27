---
id: TC-043
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-043: Board — no active milestone defaults combobox to "All stories"

## Preconditions
- App is running at http://localhost:3000.
- A project exists with stories but NO "Active" milestone (all milestones are "Planned" or "Finished", or none exist at all).

## Steps
1. Navigate to the Board view for the project (/projects/:id/board).
2. Observe the board header area.
3. Verify a `<select>` combobox is visible in the board header.
4. Verify the combobox is pre-selected to "All stories".
5. Verify all stories in the project appear on the board across their respective status columns.
6. For the case where at least one "Planned" or "Finished" milestone exists: open the combobox and verify those milestones are listed with their status hints (e.g. "Sprint 0 (Finished)"), but "All stories" remains the selected option.
7. For the case where no milestones exist at all: open the combobox and verify only "All stories" is listed.

## Expected Result
- When no active milestone exists, the Board shows all stories unfiltered.
- The milestone combobox is still visible and defaults to "All stories".
- Inactive milestones (Planned, Finished) are listed in the combobox but are not pre-selected.
- When no milestones exist at all, the combobox shows only the "All stories" option.

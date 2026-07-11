---
id: TC-042
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-042: Board — milestone combobox defaults to active milestone, re-filters on selection change

## Preconditions
- App is running at http://localhost:3000.
- A project exists with an "Active" milestone (e.g. "Sprint 1") and at least one additional milestone in any status.
- At least two stories are assigned to "Sprint 1"; at least one story belongs to the project but is NOT assigned to "Sprint 1".

## Steps
1. Navigate to the Board view for the project (/projects/:id/board).
2. Verify a `<select>` combobox is visible in the Board header area.
3. Verify the combobox is pre-selected to "Sprint 1 (Active)" on load.
4. Verify only stories assigned to "Sprint 1" are displayed on the board.
5. Open the combobox and verify "All stories" appears as the first option.
6. Verify each milestone option is labelled with its name followed by its status in parentheses (e.g. "Sprint 1 (Active)", "Sprint 2 (Planned)").
7. Select "All stories" from the combobox.
8. Verify all stories for the project are now visible on the board, including the one not assigned to "Sprint 1".
9. Select "Sprint 1 (Active)" again from the combobox.
10. Verify only stories assigned to "Sprint 1" are shown again.
11. Navigate away from the board (e.g. to the Stories tab) and return to the Board.
12. Verify the combobox resets to "Sprint 1 (Active)" on return (selection does not persist across navigation).

## Expected Result
- A `<select>` combobox is visible in the Board header at all times after milestones load.
- On load, the combobox defaults to the Active milestone when one exists.
- "All stories" is the first option in the list; milestone options include a status hint in parentheses.
- Selecting a different option immediately re-filters the board stories.
- After navigating away and back, the combobox resets to the default (active milestone).

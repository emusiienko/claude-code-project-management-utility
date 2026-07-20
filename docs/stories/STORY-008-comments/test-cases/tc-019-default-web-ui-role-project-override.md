---
id: tc-019
tags: @regression
story: STORY-008
status: Active
---

# tc-019: Default Web UI role — Project Settings override and clear override

## Preconditions
- Project Settings screen accessible at `/projects/:projectId/settings`
- The project's effective `participant_roles` list includes at least two values

## Steps
1. Navigate to `/projects/:projectId/settings`
2. Locate the "Default Web UI role" row
3. Observe whether it currently shows the inherited system value or an existing project override
4. Set an override: open the dropdown, select a different value than the current one, and save
5. Observe the row's state
6. Use "Clear override" on this row

## Expected Result
- Before overriding, the row shows the inherited system value (no override badge) if none was set
- After saving an override, the row shows the newly selected value with an "Override" badge, same visual pattern as the other five dictionary rows
- The dropdown only ever offers the project's current effective `participant_roles` values
- Using "Clear override" reverts the row to display the inherited system value again and removes the "Override" badge, the same as clearing any other project-level dictionary override on this screen

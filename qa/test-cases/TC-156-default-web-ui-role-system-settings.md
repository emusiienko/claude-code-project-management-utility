---
id: TC-156
tags: @regression
story: STORY-008
status: Active
---

# TC-156: Default Web UI role — System Settings dropdown

## Preconditions
- System Settings screen accessible at `/settings`
- The system `participant_roles` list includes "operator" (out of the box) plus other agent role values

## Steps
1. Navigate to `/settings`
2. Locate the new "Default Web UI role" row, alongside the five existing dictionary rows
3. Observe its current value
4. Open the dropdown and observe the offered options
5. Select a different value and Save

## Expected Result
- Unlike the five other dictionary rows (chip-list or link-type editors), this row renders as a single-value dropdown, not a list/tag editor
- The dropdown is pre-selected to the current system value ("operator" by default on a fresh install)
- The dropdown's options are exactly the system's effective `participant_roles` values — no other values are selectable
- Saving a new selection persists it as the new system-wide default; a success indicator appears and no error is shown
- Reloading the page shows the newly saved value as the pre-selected option

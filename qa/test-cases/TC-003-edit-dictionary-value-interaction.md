---
id: TC-003
tags: @regression
story: STORY-002
status: Active
---

# TC-003: Edit dictionary value — inline interaction states

## Preconditions

- App running at `http://localhost:3000`
- Desktop viewport (1280px)
- System Settings screen accessible at `/settings`
- System defaults seeded with at least one value per key

## Steps

### Part A — Enter and cancel edit

1. Navigate to `/settings`
2. Click the edit affordance for the `task_statuses` section
3. Verify the section enters an edit state:
   - [ ] An input field (or tag editor) appears pre-populated with current values
   - [ ] A "Save" (or equivalent confirm) button is visible and enabled
   - [ ] A "Cancel" button is visible
   - [ ] Other sections remain visible and unaffected
4. Click "Cancel"
5. Verify:
   - [ ] The section returns to read-only view
   - [ ] Values shown match the original values (no change applied)

### Part B — Save a valid edit

1. Click the edit affordance for the `task_statuses` section
2. Add a new value to the list (e.g. type "custom-status" and confirm the tag)
3. Click "Save"
4. Verify:
   - [ ] A success indicator appears (toast, inline confirmation, or button state change)
   - [ ] The section returns to read-only view showing the updated list including "custom-status"
   - [ ] No error message is visible

### Part C — Clear a project override (on Project Settings screen)

1. Navigate to `/projects/:projectId/settings`
2. Set an override for `task_statuses` (add a value and save) if none exists
3. Locate the "Clear override" affordance on the `task_statuses` section
4. Click "Clear override"
5. Verify:
   - [ ] A confirmation step or immediate action clears the override
   - [ ] The section reverts to showing the system default values
   - [ ] The "Using system default" indicator appears (or override badge disappears)
   - [ ] The "Clear override" affordance is no longer visible for this section
   - [ ] Other sections are unaffected

### Part D — Interactive states at the save button

1. On `/settings`, enter edit mode for `story_statuses`
2. Do not change any value
3. Verify the "Save" button is visually in a default/enabled state (or disabled — verify consistent with design)
4. Change a value
5. Verify the "Save" button becomes clearly active/enabled if it was previously disabled

## Expected Result

All interactive states render correctly: edit mode shows the correct controls, cancel restores original values, save persists and confirms the change, clear override reverts to system default and removes the clear affordance. No layout breaks occur during any state transition.

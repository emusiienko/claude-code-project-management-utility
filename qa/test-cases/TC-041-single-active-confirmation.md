---
id: TC-041
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-041: Single-active invariant — confirmation dialog when activating with existing Active milestone

## Preconditions
- App is running at http://localhost:3000.
- A project exists with two milestones: "Sprint 1" is "Active", "Sprint 2" is "Planned".

## Steps
1. Navigate to the Milestones tab for the project.
2. Verify "Sprint 1" shows "Active" status badge and is visually distinguished.
3. Verify "Sprint 2" shows "Planned" status badge.
4. Click "Activate" (or equivalent) on "Sprint 2".
5. Verify a confirmation dialog appears naming the currently active milestone — it must specifically mention "Sprint 1".
6. Click "Cancel" on the dialog.
7. Verify no status changes occurred: "Sprint 1" is still "Active", "Sprint 2" is still "Planned".
8. Click "Activate" on "Sprint 2" again.
9. Click "Confirm" (or equivalent) in the dialog.
10. Verify "Sprint 2" now shows "Active" status badge and is visually distinguished.
11. Verify "Sprint 1" now shows "Planned" status badge and is no longer visually distinguished as active.

## Expected Result
- Activating a milestone when another is already Active shows a confirmation dialog that names the currently active milestone.
- Cancelling the dialog leaves both milestones unchanged.
- Confirming the dialog sets the previous Active milestone back to Planned and activates the new one.
- At no point are two milestones simultaneously shown as "Active".

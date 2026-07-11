---
id: TC-040
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-040: Milestone lifecycle — Planned → Active → Finished → Active (re-activate)

## Preconditions
- App is running at http://localhost:3000.
- A project exists with one milestone in "Planned" status and no other Active milestone.

## Steps
1. Navigate to the Milestones tab for the project.
2. Verify the milestone shows a "Planned" status badge.
3. Activate the milestone (action button or status control — e.g. "Activate").
4. Verify the milestone now shows an "Active" status badge.
5. Verify the "Active" milestone row is visually distinguished from "Planned" rows (e.g. highlighted background, bold text, or a distinct color token).
6. Mark the milestone as finished (action button — e.g. "Finish").
7. Verify the milestone now shows a "Finished" status badge.
8. Verify the milestone row is no longer visually distinguished as "Active".
9. Re-activate the milestone from "Finished" (action button — e.g. "Activate").
10. Verify the milestone shows "Active" status badge again and is visually distinguished.

## Expected Result
- The lifecycle Planned → Active → Finished → Active completes without errors.
- The "Active" row is visually distinguished (color, background, badge, or similar) at steps 4 and 10.
- The visual distinction is removed when the milestone moves to "Finished" (step 8).
- All status changes are reflected immediately in the list without a full page reload.

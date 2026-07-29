---
id: tc-014
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-014: Archive a session — from the list row action and from Session Detail; archived session stays fully editable

## Preconditions
- App is running at http://localhost:3000
- Two sessions exist in the active project: Session A and Session B
- Viewport at 1280px (desktop)

## Steps
### Part A — archive from the list row action
1. In the Sessions list, use the row-level archive action on Session A.
2. Confirm Session A no longer appears in the default Sessions list.

### Part B — archive from Session Detail
3. Open Session B's Detail view.
4. Use the archive action within the Detail view.
5. Confirm Session B is archived and, if the Detail view stays open, still shows its full record with every field still visibly editable (topic, goal, context, status, participant_role, linked story/task, result_decisions, result_summary, is_complete toggle) — archiving does not lock the form or disable inputs.
6. Navigate back to the Sessions list. Confirm Session B is also no longer in the default listing.

## Expected Result
- Archive is available both as a Sessions list row action and as an action within Session Detail.
- An archived session disappears from the default (non-archived) Sessions list.
- Opening/staying on an archived session's Detail view still shows its full record with every updatable field fully editable — archiving does not restrict editing in the UI.

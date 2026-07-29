---
id: tc-011
tags: @regression
story: STORY-009
status: Active
---

# tc-011: Session Detail — topic/goal/participant_role cannot be cleared, only changed

## Preconditions
- App is running at http://localhost:3000
- An existing session is open in Detail view
- Viewport at 1280px (desktop)

## Steps
1. Attempt to clear the topic field entirely (delete all text) and save. Confirm an inline validation error is shown and the topic is not cleared — the prior value (or the edit) is retained/rejected visibly, not silently emptied.
2. Attempt to clear the goal field entirely and save. Confirm the same inline validation rejection behavior.
3. Attempt to deselect participant_role, leaving it blank, and save (if the dropdown allows a blank/placeholder selection). Confirm the same inline validation rejection behavior.
4. Confirm that context, status, result_decisions, result_summary, and the linked story/task CAN be cleared to empty/none without error (contrast case).
5. Finally, change topic/goal/participant_role each to a new non-empty valid value and save. Confirm the update succeeds.

## Expected Result
- topic, goal, and participant_role each reject an attempt to clear them, with a clear inline error — they can only be changed to a new non-empty (and, for participant_role, dictionary-valid) value.
- context, status, result_decisions, result_summary, and the linked story/task can be cleared without error, confirming the mandatory-field restriction is specific to topic/goal/participant_role.

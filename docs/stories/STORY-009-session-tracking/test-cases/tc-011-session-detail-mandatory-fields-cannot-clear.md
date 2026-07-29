---
id: tc-011
tags: @regression
story: STORY-009
status: Active
---

# tc-011: Session Detail — topic/goal/participant_role/status cannot be cleared, only changed

## Preconditions
- App is running at http://localhost:3000
- An existing session is open in Detail view
- Viewport at 1280px (desktop)

## Steps
1. Attempt to clear the topic field entirely (delete all text) and save. Confirm an inline validation error is shown and the topic is not cleared — the prior value (or the edit) is retained/rejected visibly, not silently emptied.
2. Attempt to clear the goal field entirely and save. Confirm the same inline validation rejection behavior.
3. Attempt to deselect participant_role, leaving it blank, and save (if the dropdown allows a blank/placeholder selection). Confirm the same inline validation rejection behavior.
4. Confirm the status control offers no blank/placeholder option — it is always set to one of `pending` / `in-progress` / `finished` and cannot be left or set to empty/none (status is mandatory, changed only via the three-way control, never cleared).
5. Confirm that context, result_decisions, result_summary, and the linked story/task CAN each be cleared to empty/none independently without error (contrast case).
6. Finally, change topic/goal/participant_role each to a new non-empty valid value, and change status to a different one of the three values, and save. Confirm the update succeeds.

## Expected Result
- topic, goal, participant_role, and status each cannot be cleared — they can only be changed to a new valid value (non-empty text for topic/goal, a dictionary-valid role for participant_role, one of the three fixed values for status).
- context, result_decisions, result_summary, and the linked story/task can be cleared without error, confirming the mandatory-field restriction is specific to topic/goal/participant_role/status.

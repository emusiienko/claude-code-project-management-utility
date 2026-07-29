---
id: tc-010
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-010: Session Detail — edit topic/goal/context/status/participant_role, save reflects in list and detail

## Preconditions
- App is running at http://localhost:3000
- An existing session is open in Detail view
- Viewport at 1280px (desktop)

## Steps
1. Edit the topic to a new non-empty value and save. Confirm the Detail view shows the new topic and the Sessions list reflects it too (navigate back to list to confirm).
2. Return to Detail view. Edit the goal to a new non-empty value and save. Confirm it updates.
3. Edit context to a new value and save. Confirm it updates.
4. Edit status to a new free-form string value and save. Confirm it updates (status is not restricted to a dictionary — any text is accepted).
5. Change participant_role to a different value from the dropdown and save. Confirm it updates in both Detail view and the list.
6. Change the linked story/task to a different item in the same project (or clear it, if a clear control exists) and save. Confirm it updates.
7. Set result_decisions and/or result_summary to new text and save, independently of any is_complete change. Confirm they update and `is_complete` is unaffected.

## Expected Result
- Every field listed as updatable in the spec (topic, goal, context, status, participant_role, linked story/task, result_decisions, result_summary) can be edited and saved independently.
- Omitting a field from a given edit leaves its prior value unchanged.
- Changes are reflected immediately in both Detail view and the Sessions list.

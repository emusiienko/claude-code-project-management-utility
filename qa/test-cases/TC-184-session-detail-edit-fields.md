---
id: TC-184
tags: @smoke @regression
story: STORY-009
status: Active
---

# TC-184: Session Detail — edit topic/goal/context/status/participant_role/links, save reflects in list and detail

## Preconditions
- App is running at http://localhost:3000
- An existing session is open in Detail view
- Viewport at 1280px (desktop)

## Steps
1. Edit the topic to a new non-empty value and save. Confirm the Detail view shows the new topic and the Sessions list reflects it too (navigate back to list to confirm).
2. Return to Detail view. Edit the goal to a new non-empty value and save. Confirm it updates.
3. Edit context to a new value and save. Confirm it updates.
4. Use the three-way status control to change status to a different one of the three fixed values (`pending` / `in-progress` / `finished`). Confirm it updates in both Detail view and the list, and confirm there is no free-text status input anywhere on the page.
5. Change participant_role to a different value from the dropdown and save. Confirm it updates in both Detail view and the list.
6. Change the linked story to a different story in the same project (via the story-link control) without touching the linked task. Confirm only the story link updates. Then change the linked task to a different task (via the task-link control) without touching the linked story. Confirm only the task link updates, and the story link set in the prior step is untouched.
7. Set result_decisions and/or result_summary to new text and save, independently of any status change. Confirm they update and `status` is unaffected.

## Expected Result
- Every field listed as updatable in the spec (topic, goal, context, status, participant_role, linked story, linked task, result_decisions, result_summary) can be edited and saved independently.
- The linked story and linked task are edited via two separate controls — changing one never affects the other.
- Omitting a field from a given edit leaves its prior value unchanged.
- Changes are reflected immediately in both Detail view and the Sessions list.

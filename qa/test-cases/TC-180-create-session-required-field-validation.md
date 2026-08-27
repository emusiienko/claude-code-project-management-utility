---
id: TC-180
tags: @regression
story: STORY-009
status: Active
---

# TC-180: Create session — missing topic / goal / participant_role shows inline validation errors

## Preconditions
- App is running at http://localhost:3000
- A project is selected in Sessions mode
- Viewport at 1280px (desktop)

## Steps
1. Open "Create session".
2. Leave topic empty, fill in goal and participant_role. Submit. Confirm an inline validation error is shown next to the topic field, and the form does not submit/close.
3. Restore topic, then clear goal. Submit. Confirm an inline validation error is shown next to the goal field, and the form does not submit/close.
4. Restore goal, then leave participant_role unselected (if the control allows an empty/placeholder state). Submit. Confirm an inline validation error is shown next to the participant_role field, and the form does not submit/close.
5. Fill in all three required fields correctly and submit. Confirm the session is created successfully.

## Expected Result
- Each of the three required fields (topic, goal, participant_role) independently blocks submission with a clear inline error message when left empty.
- No session is created while any required field is missing.
- Once all three are filled, submission succeeds.

---
id: tc-005
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-005: Create session — happy path (required fields only, then all fields)

## Preconditions
- App is running at http://localhost:3000
- A project is selected in Sessions mode
- Viewport at 1280px (desktop)

## Steps
### Part A — required fields only
1. Open "Create session".
2. Fill in only the required fields: topic ("Investigate flaky test"), goal ("Determine root cause of intermittent CI failure"), participant_role (select any available option from the dropdown).
3. Leave context, status, and the story/task link empty.
4. Submit.
5. Confirm the form closes and the new session appears in the list, shown as incomplete (pending), with no linked story/task indicator.

### Part B — all fields
6. Open "Create session" again.
7. Fill in topic, goal, context, status, participant_role, and select a link to an existing story in the active project.
8. Submit.
9. Confirm the new session appears in the list with the linked story indicator visible and clickable.

## Expected Result
- Both sessions are created successfully and appear in the list immediately (list refreshes without a manual reload).
- Every newly created session starts in the incomplete (pending) state.
- The session created with only required fields shows no linked item indicator; the one created with a link shows it correctly.

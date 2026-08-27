---
id: TC-179
tags: @smoke @regression
story: STORY-009
status: Active
---

# TC-179: Create session — happy path (required fields only, then all fields)

## Preconditions
- App is running at http://localhost:3000
- A project is selected in Sessions mode
- Viewport at 1280px (desktop)

## Steps
### Part A — required fields only
1. Open "Create session". Confirm there is no status input of any kind on the form (creation always starts at `pending`).
2. Fill in only the required fields: topic ("Investigate flaky test"), goal ("Determine root cause of intermittent CI failure"), participant_role (select any available option from the dropdown).
3. Leave context and both link controls (story-link and task-link) empty.
4. Submit.
5. Confirm the form closes and the new session appears in the list with status `pending`, with no linked-story indicator and no linked-task indicator.

### Part B — all fields
6. Open "Create session" again.
7. Fill in topic, goal, context, participant_role, select a link to an existing story via the story-link control, AND select a link to an existing task via the task-link control (both set at once).
8. Submit.
9. Confirm the new session appears in the list with status `pending`, and both the linked-story indicator and the linked-task indicator visible and clickable.

## Expected Result
- Both sessions are created successfully and appear in the list immediately (list refreshes without a manual reload).
- Every newly created session starts at `status: pending`; there is no create-time status input.
- The session created with only required fields shows neither link indicator; the one created with both links shows both, independently.

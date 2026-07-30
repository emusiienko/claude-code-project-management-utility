---
id: TC-183
tags: @smoke @regression
story: STORY-009
status: Active
---

# TC-183: Session Detail view — visual pass

## Preconditions
- App is running at http://localhost:3000
- A session exists with all fields populated (topic, goal, context, status, participant_role, a linked story AND a linked task both set, result_decisions, result_summary) and another session exists with only the required fields set (no links)
- Dark mode is out of scope (not implemented in this project)

## Steps
For each resolution column (375px → 767px → 768px → 1280px):
1. Set viewport to the target width
2. Open the fully-populated session's Detail view from the Sessions list
3. Verify every checklist item below
4. Repeat for the minimally-populated session (empty context/link/result fields render as empty/placeholder, not as errors or "undefined"/"null" text; status still shows a valid value, `pending`, since it can never be empty)

### Checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Detail view loads without exception screen | | | | |
| topic, goal, context, status (as a single chip/control, no separate completion badge), participant_role, linked story (own indicator), linked task (own indicator), result_decisions, result_summary, created_at, updated_at are all visible and labeled — there is no `is_complete` field anywhere | | | | |
| No horizontal scrollbar appears | | | | |
| Long field values wrap correctly, do not overflow their container | | | | |
| Empty optional fields render as an empty/placeholder state — never literal "null"/"undefined" | | | | |
| Edit controls for each updatable field are reachable and not clipped | | | | |
| The three-way status control and archive action are visible and not pushed off-screen; no "Mark complete / Mark incomplete" toggle exists | | | | |
| Touch targets >= 44px on mobile | | | | |
| Focus state renders correctly on at least one editable field | | | | |

## Expected Result
All checklist items pass at all four resolutions, for both a fully-populated and a minimally-populated session.

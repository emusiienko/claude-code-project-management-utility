---
id: tc-009
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-009: Session Detail view — visual pass

## Preconditions
- App is running at http://localhost:3000
- A session exists with all fields populated (topic, goal, context, status, participant_role, linked story or task, result_decisions, result_summary) and another session exists with only the required fields set
- Dark mode is out of scope (not implemented in this project)

## Steps
For each resolution column (375px → 767px → 768px → 1280px):
1. Set viewport to the target width
2. Open the fully-populated session's Detail view from the Sessions list
3. Verify every checklist item below
4. Repeat for the minimally-populated session (empty context/status/link/result fields render as empty/placeholder, not as errors or "undefined"/"null" text)

### Checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Detail view loads without exception screen | | | | |
| topic, goal, context, status, participant_role, linked story/task, result_decisions, result_summary, is_complete, created_at, updated_at are all visible and labeled | | | | |
| No horizontal scrollbar appears | | | | |
| Long field values wrap correctly, do not overflow their container | | | | |
| Empty optional fields render as an empty/placeholder state — never literal "null"/"undefined" | | | | |
| Edit controls for each updatable field are reachable and not clipped | | | | |
| "Mark complete / Mark incomplete" toggle and archive action are visible and not pushed off-screen | | | | |
| Touch targets >= 44px on mobile | | | | |
| Focus state renders correctly on at least one editable field | | | | |

## Expected Result
All checklist items pass at all four resolutions, for both a fully-populated and a minimally-populated session.

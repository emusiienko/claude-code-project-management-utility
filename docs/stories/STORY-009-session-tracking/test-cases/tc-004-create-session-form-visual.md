---
id: tc-004
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-004: Create Session form — visual pass

## Preconditions
- App is running at http://localhost:3000
- A project is selected in Sessions mode, with at least one story and one task existing in it (for the optional link field)
- Dark mode is out of scope (not implemented in this project)

## Steps
For each resolution column (375px → 767px → 768px → 1280px):
1. Set viewport to the target width
2. Open the "Create session" form/modal from the Sessions list
3. Verify every checklist item below

### Checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Form loads without exception screen | | | | |
| Topic, goal, context, participant_role, and two independent optional link fields (a story-link control and a task-link control) are all visible and labeled | | | | |
| Participant_role renders as a `<select>`/combobox (dropdown), not a free-text input | | | | |
| No status control and no `is_complete`/completion control of any kind is present on the create form (every session starts `pending`) | | | | |
| Form fits within the viewport — no clipped fields, no horizontal scrollbar | | | | |
| Required fields (topic, goal, participant_role) show a visual required-indicator | | | | |
| Submit/cancel controls are reachable and not pushed off-screen; touch targets >= 44px on mobile | | | | |
| Focus ring on the first field renders correctly when the form opens | | | | |

## Expected Result
All checklist items pass at all four resolutions. The Create Session form renders cleanly with no layout breaks.

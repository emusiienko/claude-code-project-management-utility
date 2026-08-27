---
id: TC-076
tags: @regression
story: STORY-006
status: Active
---

# TC-076: Task Detail Modal — Self-link attempt shows an error

## Preconditions
- App is running at http://localhost:3000
- Task A's Task Detail Modal is open
- Browser viewport set to 1280px wide

## Steps
1. In Task A's Links section, click "Add link"
2. In the target task search field, search for and select Task A itself as the target
3. Choose any directional label from the dropdown
4. Submit the form

## Expected Result
- The form does not submit successfully
- An inline error message is displayed indicating the self-link is not allowed (e.g. "A task cannot link to itself" or similar phrasing)
- No new link row appears in the Links list
- The Add link form remains open so the user can correct the selection without re-opening

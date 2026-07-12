---
id: TC-067
tags: @regression
story: STORY-005
status: Active
---

# TC-067: Form Dropdowns Populated from Project Effective Settings

## Preconditions

- App is running at `http://localhost:3000`
- A project exists; its effective settings include known values for `task_types`, `task_statuses`, and `participant_roles`
- Note the exact values in each dictionary before the test

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story in that project
3. Click "Add task" at the bottom of any column
4. Open the "type" dropdown
5. Verify:
   - [ ] The options in the dropdown exactly match the values in the project's effective `task_types` dictionary
   - [ ] No hardcoded options appear (e.g. "bug", "feature" must come from the settings, not be hardcoded)
6. Open the "assignee_role" dropdown
7. Verify options match the project's effective `participant_roles` dictionary
8. Open the "creator_role" dropdown
9. Verify options match the project's effective `participant_roles` dictionary
10. Close the create form
11. Open any column's filter bar "type" dropdown
12. Verify options match the project's effective `task_types` dictionary

## Expected Result

All dropdowns in the create/edit form and in the filter bar are populated exclusively from the project's effective settings. Values match exactly — no hardcoded or missing options.

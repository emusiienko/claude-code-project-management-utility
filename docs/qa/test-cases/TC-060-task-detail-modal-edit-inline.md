---
id: TC-060
tags: @regression
story: STORY-005
status: Active
---

# TC-060: Task Detail Modal — Edit Task Inline

## Preconditions

- App is running at `http://localhost:3000`
- At least one task exists in the Kanban

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over and click a task card title to open the Task Detail modal
3. Verify the task metadata block is displayed in read mode (not edit mode)
4. Click the "Edit task" button
5. Verify:
   - [ ] The metadata block is replaced by an inline edit form
   - [ ] All fields are pre-filled with the current task values
   - [ ] Type dropdown is populated from the project's `task_types` dictionary
   - [ ] Status dropdown is populated from the project's `task_statuses` dictionary
   - [ ] assignee_role and creator_role dropdowns are populated from the project's `participant_roles` dictionary
6. Change the title to "Edited via modal"
7. Click Save / Submit
8. Verify:
   - [ ] The inline form is replaced by the updated metadata block (read mode)
   - [ ] The title in the modal header shows "Edited via modal"
   - [ ] The corresponding task card in the Kanban board behind the modal also shows the updated title

## Expected Result

The inline edit form in the Task Detail modal saves changes correctly. After saving, the modal returns to read mode showing updated values, and the Kanban card title is also updated (board is refreshed).

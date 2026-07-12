---
id: TC-055
tags: @regression
story: STORY-005
status: Active
---

# TC-055: Create Task with All Optional Fields

## Preconditions

- App is running at `http://localhost:3000`
- At least one project exists with at least one story
- The project's effective dictionaries include `task_types`, `task_statuses`, `participant_roles`

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story
3. Click "Add task" at the bottom of any column
4. Fill in:
   - Title: "Full form task" (valid, 1–500 chars)
   - Type: select any value from the dropdown
   - Status: note the pre-filled value (read-only)
   - Content: enter multi-line Markdown text (e.g. "# Heading\n- item one\n- item two")
   - assignee_role: select any value from the dropdown
   - creator_role: select any value from the dropdown
   - Labels: add at least one key-value pair (e.g. key="env", value="staging")
5. Click Submit
6. Observe the new task card in the Kanban
7. Click the task card title to open the Task Detail modal
8. Verify in the modal:
   - [ ] Title matches what was entered
   - [ ] Type badge matches the selected type
   - [ ] Status badge matches the column status
   - [ ] assignee_role displayed correctly
   - [ ] creator_role displayed correctly
   - [ ] Markdown content is rendered (heading and list visible, not raw Markdown syntax)
   - [ ] Labels are displayed as key-value chips

## Expected Result

All optional fields are saved and displayed correctly in the Task Detail modal. Markdown content is rendered (not shown as raw text). Labels appear as chips.

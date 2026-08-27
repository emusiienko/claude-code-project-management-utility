---
id: TC-065
tags: @regression
story: STORY-005
status: Active
---

# TC-065: Kanban Board with No Tasks (Empty State)

## Preconditions

- App is running at `http://localhost:3000`
- A story exists with zero tasks

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story with no tasks
3. Verify:
   - [ ] The Kanban board area is visible (not blank/hidden)
   - [ ] All columns defined by the project's effective `task_statuses` dictionary are still rendered
   - [ ] Each column header shows the status name and count "0"
   - [ ] Column bodies are empty — no cards, no error messages, no "Something went wrong"
   - [ ] The aggregate counter above the board shows "—" or "0/0 done" appropriately (per spec: "—" when total_tasks = 0)
   - [ ] The "Add task" button at the bottom of each column is still visible and clickable
4. Click the "Add task" button on any column
5. Verify the create form opens (not an error)

## Expected Result

A story with no tasks renders all status columns with count 0, the aggregate counter shows "—", and the "Add task" buttons remain accessible. No error or empty-screen state.

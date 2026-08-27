---
id: TC-056
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-056: Edit Task via Context Menu

## Preconditions

- App is running at `http://localhost:3000`
- At least one story has at least one task on the Kanban board

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story with existing tasks
3. Hover over a task card
4. Verify the ⋯ (context menu) icon appears on hover
5. Click the ⋯ icon
6. Verify a context menu appears with at least "Edit" and "Delete" options
7. Click "Edit"
8. Verify the edit form opens with all current field values pre-filled:
   - [ ] Title field shows the current title
   - [ ] Type dropdown shows the current type
   - [ ] Status dropdown shows the current status (editable in edit mode)
   - [ ] Content field shows the current content
9. Change the title to "Updated task title"
10. Change the type to a different value
11. Click Save / Submit
12. Verify:
    - [ ] The card in the Kanban now shows the updated title
    - [ ] The type badge on the card reflects the new type
    - [ ] No error message or toast is displayed

## Expected Result

The task is updated correctly. The Kanban card reflects the new title and type badge immediately after saving. The slide-over remains open.

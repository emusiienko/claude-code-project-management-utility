---
id: TC-195
tags: @regression
story: STORY-006
status: Active
---

# TC-195: Panel pair independence — resizing one pair does not affect any other

## Preconditions
- App is running at http://localhost:3100
- At least one project exists with at least one story containing a task, so all three resizable panel pairs (project sidebar, sessions sidebar, Story Detail split) can be reached in the same session

## Steps
1. Note the default widths of all three panel pairs: the project navigation sidebar, the sessions navigation sidebar, and the Story Detail task board/right-panel split (open each once to record its starting width).
2. In the Task Manager view, drag the project navigation sidebar's border to a noticeably different width (e.g. +150px) from its default.
3. Switch to Sessions mode. Verify the sessions sidebar is still at its own default width — unaffected by the project sidebar's resize.
4. Drag the sessions sidebar's border to a noticeably different width (e.g. -100px) from its default.
5. Switch back to Task Manager mode. Verify the project navigation sidebar still shows the width set in step 2 (unaffected by the sessions sidebar resize), and has not reverted or changed.
6. Open a Story Detail slide-over. Verify the task board/right-panel split is still at its own default width — unaffected by either of the other two resizes.
7. Drag the Story Detail split's border to a noticeably different width.
8. Navigate back to the Sessions and Task Manager views again. Verify each of the other two panel pairs still holds its own previously-set width, and the Story Detail split (once reopened) still holds the width set in step 7.

## Expected Result
Each of the three panel pairs (project navigation sidebar, sessions navigation sidebar, Story Detail task board/right-panel split) remembers its own resized width independently. Resizing any one pair never changes the width of either of the other two.

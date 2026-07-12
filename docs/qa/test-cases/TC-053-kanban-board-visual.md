---
id: TC-053
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-053: Task Kanban Board — Visual Layout

## Preconditions

- App is running at `http://localhost:3000`
- At least one project exists
- That project has a story with at least one task in it
- The project's effective `task_statuses` dictionary has at least two values

## Steps

1. Set viewport to 1280px (Desktop)
2. Navigate to `/projects/:id/stories`
3. Click on a story row to open the Story Detail slide-over
4. Observe the task Kanban area in the main body of the slide-over

### Universal Visual Checklist — Desktop (1280px)

- [ ] Page loads without exception screen or "Something went wrong" overlay
- [ ] No horizontal scrollbar appears inside the slide-over
- [ ] No content overlap or clipping between Kanban columns
- [ ] Grid and spacing are consistent — columns are evenly spaced; column headers are aligned
- [ ] Text stays within column header and card boundaries — no truncated or overflowed text
- [ ] Navigation adapts correctly — slide-over remains fully visible
- [ ] Interactive elements are accessible — Add task button visible at column footer
- [ ] Element states render correctly — hover over a task card shows ⋯ context menu icon

### Screen-Specific Checks — Desktop (1280px)

- [ ] One column is rendered per value in the project's effective `task_statuses` dictionary
- [ ] Column order matches the dictionary order (not alphabetical or hardcoded)
- [ ] Each column header displays the status name and the count of cards in that column
- [ ] Each task card displays: title, type badge
- [ ] Aggregate counter "N/M done" is displayed above the Kanban board (e.g. "1/3 done")
- [ ] Filter bar appears above the board with dropdowns for type, assignee_role, creator_role
- [ ] "Add task" button or link appears at the bottom of each column

5. Set viewport to 1024px (At-lg)
6. Repeat all checklist rows above at this viewport

### Universal Visual Checklist — At-lg (1024px)

- [ ] Page loads without exception screen or "Something went wrong" overlay
- [ ] No horizontal scrollbar appears inside the slide-over
- [ ] No content overlap or clipping between Kanban columns
- [ ] Grid and spacing are consistent
- [ ] Text stays within container boundaries
- [ ] Interactive elements are accessible
- [ ] Element states render correctly

### Screen-Specific Checks — At-lg (1024px)

- [ ] Kanban columns still visible and readable
- [ ] Column headers and card content not clipped

## Expected Result

At both Desktop (1280px) and At-lg (1024px): the Kanban board renders correctly with all columns visible, correct counts in each header, the aggregate counter shows live data, the filter bar is present, and the "Add task" button is at the footer of each column. No layout breakage, overlaps, or missing elements.

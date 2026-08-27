---
id: TC-069
tags: @regression
story: STORY-005
status: Active
---

# TC-069: Tasks Kanban Board Expands When Story Description Is Hidden

## Preconditions

- App is running at `http://localhost:3000`
- At least one project and one story exist
- The story has at least one task so the kanban board is visible

## Steps

1. Set viewport to 1280px
2. Navigate to a project → Stories
3. Click on any story row to open the StorySlideOver panel
4. Confirm that both the task kanban board and the story description right panel are visible side-by-side
5. Note or measure the current width of the task kanban board area
6. Click the toggle button to hide/collapse the story description right panel
7. Observe the width of the task kanban board area

## Expected Result

After hiding the story description panel:
- The description panel is no longer visible
- The tasks kanban board expands horizontally to fill the space previously occupied by the description panel
- The kanban board columns have more horizontal room than before

## Steps to Restore

8. Click the toggle button again to show the description panel
9. Verify the layout returns to the original split view (kanban + description side by side)

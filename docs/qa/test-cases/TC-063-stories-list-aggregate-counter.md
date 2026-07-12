---
id: TC-063
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-063: Stories List Shows Live "N/M Done" Aggregate Counter

## Preconditions

- App is running at `http://localhost:3000`
- A project exists with at least two stories:
  - Story A has at least one task
  - Story B has no tasks
- The project's effective `task_statuses` dictionary includes at least one "done" equivalent value

## Steps

1. Set viewport to 1280px
2. Navigate to `/projects/:id/stories`
3. Observe the stories list table
4. Verify Story A's row:
   - [ ] Shows an "N/M done" format in the aggregate column (e.g. "1/3 done")
   - [ ] The numbers are plausible (not all zeros if tasks exist)
5. Verify Story B's row (no tasks):
   - [ ] Shows "—" (em-dash) in the aggregate column, NOT "0/0 done" or an error
6. Open the Story Detail slide-over for Story A
7. Create a new task in any column
8. Close the slide-over (navigate back to stories list)
9. Verify Story A's row in the stories list:
   - [ ] The aggregate counter has updated (total_tasks incremented by 1)

## Expected Result

Stories with tasks show a live "N/M done" counter. Stories with no tasks show "—". After creating a new task in a story, the counter on the stories list updates to reflect the new total.

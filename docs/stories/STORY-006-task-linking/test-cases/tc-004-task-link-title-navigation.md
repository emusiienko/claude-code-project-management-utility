---
id: tc-004
tags: @smoke @regression
story: STORY-006
status: Active
---

# tc-004: Task Detail Modal — Clicking a linked task title navigates to that task's modal

## Preconditions
- App is running at http://localhost:3000
- Task A and Task B exist in the same story, linked to each other
- Task Detail Modal for Task A is open
- Browser viewport set to 1280px wide

## Steps
1. In Task A's Links section, locate the row showing Task B
2. Click Task B's title in the link row
3. Observe the result

## Expected Result
- The browser URL updates to include Task B's task ID (e.g. `/projects/:id/stories/:storyId/tasks/:taskBId`)
- Task B's Task Detail Modal is now displayed (the modal header or title shows Task B's name)
- The navigation happens without a full page reload
- Task A's modal is replaced by (or transitions to) Task B's modal — no double-modal stacking visible
- The Back navigation (if present) or closing the modal returns to the story slide-over view

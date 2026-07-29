---
id: tc-013
tags: @regression
story: STORY-009
status: Active
---

# tc-013: Session Detail — clicking a linked story/task navigates to its own detail view in Task Manager

## Preconditions
- App is running at http://localhost:3000
- A session exists linked to a story in the active project, and another session exists linked to a task in the active project
- Viewport at 1280px (desktop)

## Steps
1. Open the Detail view for the session linked to a story.
2. Click the linked story indicator/link.
3. Confirm the app navigates away from Sessions mode into Task Manager, landing on that story's own detail view (slide-over), showing the correct story.
4. Return to Sessions mode via the app-switcher, open the Detail view for the session linked to a task.
5. Click the linked task indicator/link.
6. Confirm the app navigates to that task's own Task Detail view in Task Manager.

## Expected Result
- Clicking a linked story or task from Session Detail leaves Sessions mode and lands on that item's own detail view in Task Manager, consistent with cross-linking conventions used elsewhere in the app (e.g. Story/Task links).
- The correct linked item is opened in both cases (story link → story detail; task link → task detail).

---
id: tc-005
tags: @smoke @regression
story: STORY-016
status: Active
---

# tc-005: Stories list at /projects/:id/stories — CRUD preserved, title click opens slide-over

## Preconditions
App is running. Project with at least one story exists.

## Steps
1. Navigate to /projects/:id/stories.
2. Verify the Stories list shows a table with Title, Status, Labels, Tasks, Actions columns.
3. Verify the filter bar (Status, Label key, Label value, Apply, Clear) is present.
4. Click a story title in the list.
5. Verify the slide-over opens and the URL changes to /projects/:id/stories/:storyId.
6. Close the slide-over.
7. Click the "New story" button.
8. Verify the New story modal opens.
9. Cancel.
10. Click the Edit icon for a story.
11. Verify the Edit story modal opens with pre-filled data.
12. Cancel.
13. Verify the story list is intact after all interactions.

## Expected Result
- Stories list renders correctly at /projects/:id/stories.
- Story title click opens the slide-over (not the edit modal).
- New story and Edit story modals open correctly.
- CRUD actions from STORY-004 are fully preserved.

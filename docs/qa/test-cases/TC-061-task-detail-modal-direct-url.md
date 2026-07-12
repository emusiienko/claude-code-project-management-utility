---
id: TC-061
tags: @regression
story: STORY-005
status: Active
---

# TC-061: Task Detail Modal — Direct URL Navigation

## Preconditions

- App is running at `http://localhost:3000`
- A valid task exists; note its `taskId` and its parent `projectId` and `storyId`

## Steps

1. Set viewport to 1280px
2. Construct the direct URL: `/projects/:id/stories/:storyId/tasks/:taskId`
3. Navigate directly to this URL in the browser (paste into address bar)
4. Verify:
   - [ ] The Story Detail slide-over renders and is visible
   - [ ] The Task Detail modal renders on top of the slide-over immediately (not after a delay requiring a click)
   - [ ] The modal displays the correct task title and metadata
   - [ ] The URL remains at the task sub-route

## Expected Result

Navigating directly to the task URL renders the full scene: slide-over open behind the modal, modal showing the correct task data. No blank screen or "Not found" error for a valid task ID.

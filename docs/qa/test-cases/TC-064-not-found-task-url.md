---
id: TC-064
tags: @regression
story: STORY-005
status: Active
---

# TC-064: Non-Existent Task ID in Modal URL Shows "Not Found"

## Preconditions

- App is running at `http://localhost:3000`
- A valid project and story exist; note their IDs

## Steps

1. Set viewport to 1280px
2. Construct a URL with a non-existent (fabricated) taskId, e.g.:
   `/projects/:projectId/stories/:storyId/tasks/00000000-0000-0000-0000-000000000000`
3. Navigate directly to this URL in the browser
4. Verify:
   - [ ] The Story Detail slide-over is open and visible
   - [ ] The Task Detail modal is open on top of the slide-over
   - [ ] The modal body shows a "Not found" state (message, icon, or equivalent — not a blank white box or a JS error)
   - [ ] No full-page error screen or "Something went wrong" overlay appears
   - [ ] The slide-over behind the modal remains functional and visible

## Expected Result

A non-existent task ID in the URL renders a "Not found" state inside the Task Detail modal. The slide-over behind it remains intact. No application crash or white screen.

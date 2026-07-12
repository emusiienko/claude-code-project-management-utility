---
id: TC-059
tags: @smoke @regression
story: STORY-005
status: Active
---

# TC-059: Task Detail Modal — Open, Display, and Close

## Preconditions

- App is running at `http://localhost:3000`
- At least one story has at least one task with a title

## Steps

1. Set viewport to 1280px
2. Open the Story Detail slide-over for a story with at least one task
3. Note the task's title in the Kanban card
4. Click the task card's title
5. Verify URL changes to `/projects/:id/stories/:storyId/tasks/:taskId`
6. Verify the Task Detail modal appears on top of the slide-over:
   - [ ] The modal is visible and overlays the slide-over
   - [ ] The slide-over behind the modal is dimmed but still visible (not hidden/unmounted)
   - [ ] The modal header shows the task title
   - [ ] A close button (✕) is visible in the modal header
   - [ ] The modal body shows: type badge, status badge
   - [ ] A "Links — coming in STORY-006" (or equivalent) placeholder section is visible
   - [ ] An "Attachments — coming in STORY-007" (or equivalent) placeholder section is visible
   - [ ] A "Comments — coming in STORY-008" (or equivalent) placeholder section is visible
7. Press Escape key
8. Verify:
    - [ ] The modal closes
    - [ ] The URL restores to `/projects/:id/stories/:storyId`
    - [ ] The slide-over is still open and visible
9. Click the task card title again to reopen the modal
10. Click the ✕ button in the modal header
11. Verify:
    - [ ] The modal closes
    - [ ] The URL restores to the story route
    - [ ] The slide-over is still open

## Expected Result

The Task Detail modal opens correctly from the Kanban card, shows task metadata and placeholder sections, and closes via both ✕ button and Escape key. The URL reflects the open/closed state and the slide-over remains mounted throughout.

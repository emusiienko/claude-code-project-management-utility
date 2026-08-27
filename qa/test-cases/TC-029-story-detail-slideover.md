---
id: TC-029
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-029: Story Detail slide-over — animation, header, close behaviors, right panel, deep-link

## Preconditions
App is running. Project with at least one story exists.

## Steps
1. Navigate to /projects/:id/stories.
2. Click a story title. Verify slide-over animates in from the right, background is dimmed, URL updates to /projects/:id/stories/:storyId.
3. Verify the fixed header shows: "← Stories" breadcrumb, story title, status badge, Edit button, close (✕) button.
4. Verify the main area shows a task kanban (TODO, IN-PROGRESS, DONE columns).
5. Verify the right panel is visible with DESCRIPTION, ATTACHMENTS, COMMENTS sections.
6. Click the collapse panel button (‹). Verify the right panel collapses.
7. Reload the page. Verify the right panel remains collapsed (localStorage persists per story).
8. Close the slide-over via the ✕ button. Verify URL returns to /projects/:id/stories.
9. Click the story title to reopen the slide-over.
10. Press Escape key. Verify slide-over closes and URL returns to /projects/:id/stories.
11. Open the slide-over from the breadcrumb "← Stories". Verify it closes and returns to /projects/:id/stories.
12. Navigate directly to /projects/:id/stories/:storyId. Verify slide-over opens immediately.
13. Click Edit button in the slide-over header. Verify Edit story modal opens.

## Expected Result
- Slide-over animates from right, dims background, updates URL.
- Header contains breadcrumb, title, status badge, Edit, and close buttons.
- Task kanban (3 columns) visible in main area.
- Right panel toggle persists in localStorage per story (key: story:panel:<storyId>).
- ✕ button, Escape key, and breadcrumb all close the slide-over and restore the previous URL.
- Deep-link (/projects/:id/stories/:storyId) renders with slide-over already open.

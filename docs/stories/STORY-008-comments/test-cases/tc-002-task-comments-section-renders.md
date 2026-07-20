---
id: tc-002
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-002: Task Detail Modal — Comments section renders correctly

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one story containing at least one task
- Browser viewport set to 1280px wide

## Steps
1. Navigate to a story's task board / task list and open a task's Task Detail modal
2. Scroll the modal down to the "Comments" section (below Attachments)

## Expected Result
- A heading labeled "Comments" is visible, with a live count badge
- When no comments exist, an empty state is shown (placeholder text — no error, no spinner)
- When comments exist, the thread renders oldest-first with author role, Markdown content, label chips, and a timestamp per entry
- Each comment exposes inline Edit, Reply, Delete, and Copy link icon actions
- An "Add Comment" form is pinned at the bottom of the section (author_role input, content textarea, labels editor)
- The section does not overflow the modal; no horizontal scrollbar appears
- No "Something went wrong" overlay or console error while the section loads

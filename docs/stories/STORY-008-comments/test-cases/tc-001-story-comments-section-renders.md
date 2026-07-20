---
id: tc-001
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-001: Story slide-over — Comments section renders correctly

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one story
- Browser viewport set to 1280px wide

## Steps
1. Navigate to a project's Stories screen
2. Click on a story row to open the Story slide-over
3. Scroll the right panel down to the "Comments" section (below Attachments)

## Expected Result
- A heading labeled "Comments" is visible, with a live count badge showing the current number of comments
- When no comments exist, an empty state is shown (placeholder text — no error, no spinner)
- When comments exist, the thread is rendered newest-first; each entry shows the author role, the comment content rendered as Markdown, its label chips (if any), and a timestamp
- Each comment exposes inline Edit, Reply, Delete, and Copy link icon actions
- An "Add Comment" form is pinned at the top of the section, above the thread, containing an author_role text input, a content Markdown textarea, and a labels editor
- The section does not overflow its container; no horizontal scrollbar appears within the slide-over
- No "Something went wrong" overlay or console error while the section loads

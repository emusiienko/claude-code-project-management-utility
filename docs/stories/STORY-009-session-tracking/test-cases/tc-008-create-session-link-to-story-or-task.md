---
id: tc-008
tags: @regression
story: STORY-009
status: Active
---

# tc-008: Create session — optional link to a story or task, scoped to the active project only

## Preconditions
- App is running at http://localhost:3000
- At least two projects exist. Project A has its own stories/tasks; Project B has different stories/tasks.
- Viewport at 1280px (desktop)

## Steps
1. In Sessions mode, select Project A. Open "Create session".
2. Open the story/task link selector. Confirm only Project A's stories/tasks are offered as options — none of Project B's items appear.
3. Select a story from Project A, fill required fields, and submit. Confirm the session is created and shows the linked story.
4. Repeat steps 1–3 linking to a task instead of a story, confirming the same project-scoping.
5. Create one more session leaving the link field empty. Confirm it is created successfully with no linked item shown — the link is optional.

## Expected Result
- The story/task link selector on the Create Session form only ever offers items belonging to the currently active project.
- A session can be created with a link to a story, a link to a task, or no link at all — all three are valid.

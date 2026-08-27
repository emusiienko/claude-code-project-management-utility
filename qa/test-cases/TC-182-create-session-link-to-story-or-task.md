---
id: TC-182
tags: @regression
story: STORY-009
status: Active
---

# TC-182: Create session — independent optional links to a story and a task, scoped to the active project only

## Preconditions
- App is running at http://localhost:3000
- At least two projects exist. Project A has its own stories/tasks; Project B has different stories/tasks.
- Viewport at 1280px (desktop)

## Steps
1. In Sessions mode, select Project A. Open "Create session". Confirm the form shows two separate controls — a story-link control and a task-link control (not one either/or selector).
2. Open the story-link control. Confirm only Project A's stories are offered — none of Project B's stories appear. Open the task-link control (its two-step "pick the task's story, then the task" picker). Confirm only Project A's stories/tasks are offered there too.
3. Select a story from Project A in the story-link control only (leave the task-link control unset), fill required fields, and submit. Confirm the session is created showing only a linked story, no linked task.
4. Create another session: set only the task-link control (leave the story-link control unset). Confirm the session is created showing only a linked task, no linked story.
5. Create another session: set both the story-link control and the task-link control at once. Confirm setting one never cleared or overwrote the other, and the created session shows both a linked story and a linked task.
6. Create one final session leaving both link controls empty. Confirm it is created successfully with neither link shown — both links are optional and independent.

## Expected Result
- Both the story-link control and the task-link control on the Create Session form only ever offer items belonging to the currently active project.
- The two link controls are fully independent: a session can be created with a story link alone, a task link alone, both at once, or neither — all four combinations are valid, and setting one control never affects the other.

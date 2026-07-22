---
id: tc-007
tags: @regression
story: STORY-022
status: Active
---

# tc-007: The global Projects/Config overlay opens on top of and stays usable over an open Story slide-over / Task Detail modal

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one story that has at least one task

## Steps
1. Navigate to `/projects/:id/stories` for that project.
2. Click a story to open its slide-over.
3. Click the global "Projects" entry in the top bar. Verify the Projects overlay renders visibly on top of the slide-over, fully usable (this composes correctly with a single layer beneath it).
4. Dismiss the Projects overlay. Within the slide-over's task kanban, click a task to open the Task Detail modal on top of the slide-over.
5. With both the slide-over and the Task Detail modal open, click the global "Projects" entry in the top bar.
6. Verify the Projects overlay panel is visible on top of both, fully usable — inspect for a visible panel with the project list, not just an active top-bar button with nothing else changed on screen.
7. Repeat steps 5–6 with "Config" instead of "Projects".

## Expected Result
- The Projects/Config overlay renders above the current main view and any Story slide-over / Task Detail modal already open, fully visible and interactive, regardless of how many layers are already open underneath — consistent with the top-bar entries being reachable and usable "from anywhere."
- Opening/dismissing the overlay never navigates away from or unmounts the Story slide-over / Task Detail modal underneath; they remain exactly as they were once the overlay is dismissed.

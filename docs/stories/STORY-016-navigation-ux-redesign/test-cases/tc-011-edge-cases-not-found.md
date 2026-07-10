---
id: tc-011
tags: @regression
story: STORY-016
status: Active
---

# tc-011: Edge cases — non-existent project, non-existent story

## Preconditions
App is running.

## Steps
1. Navigate to /projects/00000000-0000-0000-0000-000000000099/stories (non-existent project ID).
2. Verify an inline "Project not found." message is shown with a link back to /projects.
3. Verify no crash or white screen occurs.
4. Navigate to /projects/:validId/stories/00000000-0000-0000-0000-000000000099 (non-existent story ID).
5. Verify the project view loads with the slide-over area showing "Story not found" and a "Back to Stories" button.
6. Verify no crash or white screen occurs.

## Expected Result
- Non-existent project ID shows "Project not found." inline message with a back link.
- Non-existent story ID shows "Story not found" inside the slide-over with a "Back to Stories" button.
- No unhandled crashes in either case.

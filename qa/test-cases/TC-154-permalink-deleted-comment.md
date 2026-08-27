---
id: TC-154
tags: @regression
story: STORY-008
status: Active
---

# TC-154: Permalink to a deleted comment — navigates to host view, no error

## Preconditions
- A comment exists on a story, task, or milestone

## Steps
1. Copy the comment's permalink URL
2. Delete the comment
3. Open the copied permalink URL

## Expected Result
- The app still navigates to the comment's host view (the Story slide-over, Task Detail modal, or Milestone Detail page it belonged to) with the Comments section expanded
- There is simply nothing to scroll to or highlight — this is not treated as an error; no error screen, toast, or console exception appears
- The rest of the host view (other comments, attachments, etc.) renders normally

---
id: tc-017
tags: @regression
story: STORY-008
status: Active
---

# tc-017: Comments behave consistently across Story, Task, and Milestone hosts

## Preconditions
- A story, a task, and a milestone are each reachable and have their Comments section visible

## Steps
1. On each of the three hosts, perform the same sequence: add a comment, edit it, reply to it, copy its link, then delete the reply and the original comment
2. Compare the behavior and appearance of the section across all three hosts

## Expected Result
- The Comments section heading, count badge, thread layout, per-comment actions (Edit/Reply/Delete/Copy link), and Add Comment form look and behave identically across the Story slide-over, Task Detail modal, and Milestone Detail page
- Add/Edit/Reply/Copy link/Delete all succeed on every host with no host-specific error or missing control
- No layout or interaction discrepancy is observed between hosts beyond the surrounding page chrome

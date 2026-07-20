---
id: tc-006
tags: @regression
story: STORY-008
status: Active
---

# tc-006: Edit a comment — content and labels editable, author_role read-only

## Preconditions
- A host's Comments section has at least one existing comment with a known author_role

## Steps
1. Click Edit on an existing comment
2. Observe the entry as it switches into edit mode
3. Change the `content` text and add or remove a label
4. Save the edit
5. Attempt to locate any control that would change `author_role` while in edit mode

## Expected Result
- Edit mode shows an inline form for `content` and `labels` only
- `author_role` is displayed as read-only text in edit mode — there is no input, dropdown, or other control that allows changing it
- Saving updates the comment's displayed content and labels in place, without changing its position in the thread or its timestamp misleadingly
- The comment's `author_role` after saving is unchanged from before the edit
- No error banner or console error appears during the edit/save cycle

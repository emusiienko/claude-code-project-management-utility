---
id: tc-008
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-008: Delete a comment — confirmation dialog, permanent removal, count updates

## Preconditions
- A host's Comments section has at least two comments

## Steps
1. Note the current Comments count badge
2. Click Delete on one comment row
3. Observe the confirmation dialog; confirm the deletion

## Expected Result
- A confirmation dialog appears before the deletion completes, using the standard destructive-action confirmation styling (danger color)
- On confirm, the comment disappears from the thread without a full page reload
- The count badge decrements by one
- The remaining comment(s) stay in their original newest-first order
- No error banner or console error appears during the deletion

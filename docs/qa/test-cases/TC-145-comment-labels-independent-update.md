---
id: TC-145
tags: @regression
story: STORY-008
status: Active
---

# TC-145: Comment labels — independent update from content, empty array clears labels

## Preconditions
- A host's Comments section has at least one existing comment with both content and at least one label

## Steps

### Part A — content-only update
1. Edit the comment; change only `content`, leaving labels untouched
2. Save

### Part B — labels-only update
1. Edit the same comment again; change only the labels (add or remove one), leaving `content` untouched
2. Save

### Part C — clear all labels
1. Edit the comment again; remove every label so the labels editor is empty
2. Save

## Expected Result
- Part A: after saving, the comment's content reflects the change; its labels are exactly as they were before this edit
- Part B: after saving, the comment's labels reflect the change; its content is exactly as it was before this edit
- Part C: after saving, the comment shows no label chips at all — this is treated as a valid, successful update, not an error
- No error banner or console error appears in any part

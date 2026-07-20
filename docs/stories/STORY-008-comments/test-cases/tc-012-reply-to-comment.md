---
id: tc-012
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-012: Reply to a comment — chip, dismiss, flat posting, reply-prefix line

## Preconditions
- A host's Comments section has at least one existing comment (the "original")

## Steps

### Part A — reply and submit
1. Click Reply on the original comment
2. Observe the Add Comment form (it should scroll into view if not already visible)
3. Observe the `content` field
4. Type a short reply message and submit

### Part B — dismiss before submitting
1. Click Reply on any comment
2. Observe the dismissible chip above the compose form
3. Dismiss the chip (without submitting)
4. Type a message and submit

## Expected Result
- Part A: clicking Reply shows a dismissible chip reading something like "↩ Replying to {author_role}'s comment" above the compose form; the `content` field is NOT pre-filled with any link or text — the cursor is simply ready for the author's own words
- `author_role` still pre-fills from the effective default Web UI role exactly as for any new comment; labels behave identically
- After submitting, the new comment appears at the bottom of the flat, oldest-first thread (no visual nesting or indentation) and shows a "↩ Replying to {author_role}" prefix line pointing back at the original comment
- Part B: dismissing the chip before submitting removes the reply association — the resulting comment posts as an ordinary comment with no reply-prefix line
- No error banner or console error appears in either part

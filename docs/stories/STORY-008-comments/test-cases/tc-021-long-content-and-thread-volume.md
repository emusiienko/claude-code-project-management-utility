---
id: tc-021
tags: @regression
story: STORY-008
status: Active
---

# tc-021: Long content and thread volume do not break the Comments section layout

## Preconditions
- A host's Comments section is accessible

## Steps
1. Add a comment with a long block of Markdown content (e.g. a long paragraph plus a bulleted list, several hundred words)
2. Add roughly 15-20 additional short comments to the same thread (replies and top-level comments mixed)
3. Scroll through the resulting thread

## Expected Result
- The long comment's content wraps within its container — no horizontal overflow, no clipped text, no distorted layout of neighboring comments
- With ~15-20+ comments in the thread, the section remains scrollable and usable; the pinned Add Comment form stays accessible at the top of the section without being pushed off-screen as the thread grows
- The count badge accurately reflects the total number of comments after all additions
- No layout break, overlap, or console error occurs at any point during this test

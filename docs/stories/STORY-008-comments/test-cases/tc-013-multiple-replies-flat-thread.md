---
id: tc-013
tags: @regression
story: STORY-008
status: Active
---

# tc-013: Multiple replies and reply-to-reply — thread stays flat, newest-first

## Preconditions
- A host's Comments section has at least one existing comment ("Comment A")

## Steps
1. Reply to Comment A twice (two independent replies, "Reply B" and "Reply C")
2. Reply to Reply B once ("Reply D" — a reply to a reply)
3. Observe the full thread layout

## Expected Result
- All four comments (A, B, C, D) appear in a single flat list, ordered newest-first by creation time (so the last-created reply — D or C, whichever was posted last — appears at the top, and Comment A appears at the bottom)
- There is no nested/indented/threaded visual grouping anywhere — every comment, including a reply to a reply, sits at the same visual level
- Reply B and Reply C both show a reply-prefix line pointing back to Comment A
- Reply D shows a reply-prefix line pointing back to Reply B (its direct parent), not to Comment A
- No error banner, console error, or layout break occurs regardless of how many replies point at the same comment

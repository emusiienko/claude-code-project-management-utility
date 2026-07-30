---
id: TC-191
tags: @regression
story: STORY-009
status: Active
---

# TC-191: Long content and many sessions do not break list or detail layout

## Preconditions
- App is running at http://localhost:3000
- At least one session exists with very long values for topic (near 500 chars), goal (near 500 chars), and a long unbroken context string (status is a fixed short enum — `pending`/`in-progress`/`finished` — and is not subject to this long-string case)
- The active project has a large number of sessions (e.g. 30+) to stress the list
- Viewport at 1280px (desktop), and once at 375px (mobile) for a defensive smoke pass

## Steps
1. Open the Sessions list. Locate the session with the long topic value. Confirm the row truncates or wraps the text gracefully — no horizontal overflow, no breaking of row height for neighboring rows.
2. Open that session's Detail view. Confirm the long topic, goal, and context values wrap correctly and remain fully readable without clipping.
3. Scroll through a project with 30+ sessions. Confirm the list remains performant and visually consistent (consistent row height/spacing) across the full scroll — no layout jump or misalignment appears partway through the list.
4. Repeat step 1 at 375px viewport as a defensive smoke pass (per architecture, 1024px is the minimum supported width, so this is not a hard requirement, only a smoke check).

## Expected Result
- Long field values are handled gracefully in both list and detail views — truncation or wrapping, never raw overflow or broken layout.
- A large number of sessions does not degrade layout consistency or introduce visual glitches while scrolling.

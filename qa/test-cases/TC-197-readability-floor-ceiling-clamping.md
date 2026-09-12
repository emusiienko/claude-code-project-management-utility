---
id: TC-197
tags: @regression
story: STORY-006
status: Active
---

# TC-197: Readability floor/ceiling — dragging past the limits clamps instead of collapsing or overflowing

## Preconditions
- App is running at http://localhost:3100
- At least one project exists with at least one story containing a task
- Viewport at 1280px (desktop)

## Steps
For each of the three panel pairs (project navigation sidebar, sessions navigation sidebar, Story Detail task board/right-panel split):
1. Drag the border as far as possible toward shrinking the list/navigation-style panel (the project sidebar, the sessions sidebar, or the task board respectively), continuing to drag well past the point where movement visibly stops.
2. Verify that panel stops shrinking at some floor width, remains legible (text/icons not overlapping or clipped into illegibility), and does not collapse to zero width or disappear.
3. Verify the border itself stays at the floor position and does not follow the cursor any further.
4. Drag the border as far as possible in the opposite direction (shrinking the other, content-style panel — the main content, the sessions content, or the right-hand detail panel respectively), continuing well past the point where movement visibly stops.
5. Verify that other panel also stops shrinking at some floor/ceiling width, remains legible, and does not collapse, overlap, or get pushed off-screen.
6. Verify the border stays at that limit position and does not follow the cursor any further.

## Expected Result
In both drag directions, for every one of the three panel pairs, the border stops moving once a panel would become unreadably narrow — neither panel ever collapses to zero, overlaps its neighbor, or is pushed off-screen — and the border visibly stays put at the limit even while the mouse button is still held and moving further.

---
id: TC-198
tags: @regression
story: STORY-006
status: Active
---

# TC-198: Resizable panels adapt to viewport changes — kept width where there's room, responsive fallback, and no affordance at narrow widths

## Preconditions
- App is running at http://localhost:3100
- At least one project exists with at least one story containing a task

## Steps
For each of the three panel pairs (project navigation sidebar, sessions navigation sidebar, Story Detail task board/right-panel split):
1. At 1280px viewport, drag the pair's border to a manually-chosen width clearly different from its default.
2. Narrow the browser window gradually down to 1024px. Verify the manually-chosen width is kept as long as there is room for it alongside the readability floor.
3. Continue narrowing the window below 1024px, down to 768px, then 767px, then 375px.
4. Verify that once the window becomes too narrow to honor both the chosen width and the readability floor, the panel pair falls back to its default/responsive sizing for that viewport, rather than overlapping or hiding content.
5. At each of the narrower widths (768px, 767px, 375px) where the layout has already switched to its existing stacked/collapsed small-viewport presentation (per that screen's own responsive behavior), verify the resize affordance (hover cursor / draggable border) is no longer offered — there is no side-by-side border to drag.
6. Widen the browser window back to 1280px. Verify the layout returns to a side-by-side presentation with the resize affordance available again (the manually-chosen width from step 1 is not required to reappear, since it was already superseded by the responsive fallback in step 4 — only confirm the pair is at some sane, non-overlapping width and resizing works again).

## Expected Result
A manually-resized panel pair keeps its chosen width as the window narrows, for as long as there is room for it. Once the window is too narrow, the panel pair falls back to default/responsive sizing without overlapping or hiding content. At viewport widths where the layout already stacks/collapses (below the side-by-side breakpoint), the resize affordance is not offered. Resizing works again once the window is widened back into side-by-side territory.

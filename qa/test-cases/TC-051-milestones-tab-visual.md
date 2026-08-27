---
id: TC-051
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-051: Milestones tab — visual layout at all breakpoints

## Preconditions
- App is running at http://localhost:3000.
- A project exists with at least three milestones in mixed statuses: one "Planned", one "Active", one "Finished".
- One milestone has a long description (100+ characters).

## Steps

Set the viewport to each resolution column and navigate to the Milestones tab for the project. For each resolution, verify the full checklist below.

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|---------------|-----------------|--------------|-----------------|
| Page loads without error screen | | | | |
| No horizontal scrollbar | | | | |
| Milestone rows not clipped or overlapping | | | | |
| Status badges fully visible and readable | | | | |
| Long description truncated — no text overflow outside row | | | | |
| Story count column aligned with header | | | | |
| Action buttons / controls reachable (not off-screen) | | | | |
| "Active" milestone row visually distinguished | | | | |
| Create milestone button visible and reachable | | | | |
| Navigation adapts at correct breakpoint | | | | |

## Expected Result
- All checks pass at all four resolutions.
- At mobile widths (375px, 767px), the layout adapts gracefully — no elements are cut off or require horizontal scrolling.
- The "Active" milestone row is visually distinguished at every resolution.

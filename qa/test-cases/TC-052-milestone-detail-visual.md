---
id: TC-052
tags: @smoke @regression
story: STORY-012
status: Active
---

# TC-052: Milestone Detail page — visual layout at all breakpoints

## Preconditions
- App is running at http://localhost:3000.
- A project exists with a milestone "Sprint 1" that has at least five stories assigned and a description of 100+ characters.

## Steps

Set the viewport to each resolution column and navigate to the Milestone Detail page. For each resolution, verify the full checklist below.

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|---------------|-----------------|--------------|-----------------|
| Page loads without error screen | | | | |
| No horizontal scrollbar | | | | |
| Milestone name and status visible and not clipped | | | | |
| Description text stays within container boundaries | | | | |
| Stories list rows not overlapping | | | | |
| Pagination controls reachable and visible | | | | |
| Navigation adapts at correct breakpoint | | | | |
| Interactive elements (pagination, action buttons) accessible | | | | |

## Expected Result
- All checks pass at all four resolutions.
- No content overflow or clipping at any breakpoint.

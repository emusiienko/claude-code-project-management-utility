---
id: tc-002
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-002: Sessions list screen — visual pass

## Preconditions
- App is running at http://localhost:3000
- A project is selected in Sessions mode and has at least 5 sessions with a mix of complete/incomplete, some linked to a story/task and some not
- Dark mode is out of scope (not implemented in this project)

## Steps
For each resolution column (375px → 767px → 768px → 1280px):
1. Set viewport to the target width
2. Navigate to the Sessions list for the selected project
3. Verify every checklist item below

### Checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Page loads without exception screen or overlay | | | | |
| No horizontal scrollbar appears | | | | |
| Each row shows topic, status, participant_role, linked story/task indicator, created_at, and a completion indicator — none clipped or overlapping | | | | |
| Completion indicator (complete vs. pending) is visually distinguishable at a glance | | | | |
| Linked story/task indicator is visually distinct when present vs. absent | | | | |
| Grid/row spacing is consistent; columns align with headers (if a table layout is used) | | | | |
| Long topic text stays within its container — no overflow breaking the row | | | | |
| Project-selector sidebar remains visible/collapsible per the same breakpoint rules as Task Manager's sidebar | | | | |
| Interactive elements (row actions, filters) are not pushed off-screen; touch targets >= 44px on mobile | | | | |
| Hover/focus state renders correctly on at least one session row | | | | |

## Expected Result
All checklist items pass at all four resolutions. The Sessions list renders cleanly with no layout breaks, clipping, or overlap.

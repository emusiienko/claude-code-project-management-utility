---
id: TC-072
tags: @regression
story: STORY-006
status: Active
---

# TC-072: Task Detail Modal — Outbound and inbound direction indicators display correctly

## Preconditions
- App is running at http://localhost:3000
- Task A and Task B exist in the same story, with a link created: Task A → Task B (outbound from A)
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for Task A
2. Observe the link row in the Links section — note the direction indicator
3. Close Task A's modal
4. Open the Task Detail Modal for Task B
5. Observe the link row in the Links section — note the direction indicator

## Expected Result
- In Task A's modal: the link row shows an outbound indicator (e.g. "→") before or beside Task B's title
- In Task B's modal: the same link appears with an inbound indicator (e.g. "←") before or beside Task A's title
- Both rows display the same link type badge with direction-appropriate human-readable text
- Direction indicators are visually distinct and clearly readable
- No content overlap or truncation of the direction indicator or link type badge

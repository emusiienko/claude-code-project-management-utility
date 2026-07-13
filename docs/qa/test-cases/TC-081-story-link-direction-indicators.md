---
id: TC-081
tags: @regression
story: STORY-006
status: Active
---

# TC-081: Story slide-over — Outbound and inbound direction indicators display correctly

## Preconditions
- App is running at http://localhost:3000
- Story A and Story B exist in the same project, with a link created: Story A → Story B
- Browser viewport set to 1280px wide

## Steps
1. Open Story A's slide-over
2. In the Links section, note the direction indicator on the link row for Story B
3. Close Story A's slide-over
4. Open Story B's slide-over
5. In the Links section, note the direction indicator on the link row for Story A

## Expected Result
- In Story A's slide-over: the link row shows an outbound indicator (e.g. "→") and Story B's title
- In Story B's slide-over: the same link appears with an inbound indicator (e.g. "←") and Story A's title
- Both rows show the same link type badge with direction-appropriate human-readable text
- Direction indicators are visually distinct and clearly readable
- No content overlap or truncation

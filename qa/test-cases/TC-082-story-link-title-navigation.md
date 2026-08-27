---
id: TC-082
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-082: Story slide-over — Clicking a linked story title opens that story's slide-over

## Preconditions
- App is running at http://localhost:3000
- Story A and Story B are linked; Story A's slide-over is open
- Browser viewport set to 1280px wide

## Steps
1. In Story A's slide-over Links section, locate the row for Story B
2. Click Story B's title in the link row
3. Observe the result

## Expected Result
- The browser URL updates to include Story B's story ID (e.g. `/projects/:id/stories/:storyBId`)
- Story B's slide-over is now displayed — the slide-over header or title area reflects Story B's name
- The navigation happens without a full page reload
- Story A's slide-over is replaced by Story B's slide-over — no double-panel stacking visible
- Closing Story B's slide-over returns to the Stories list view

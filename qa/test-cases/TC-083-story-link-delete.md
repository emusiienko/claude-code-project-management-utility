---
id: TC-083
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-083: Story slide-over — Delete a story link via confirmation dialog

## Preconditions
- App is running at http://localhost:3000
- Story A and Story B are linked; Story A's slide-over is open showing the link row
- Browser viewport set to 1280px wide

## Steps
1. In Story A's Links section, click the Delete button on the link row for Story B
2. Observe the confirmation dialog that appears
3. Click "Confirm" (or equivalent) in the dialog

## Expected Result
- Clicking Delete opens a confirmation dialog before any deletion occurs
- The dialog clearly communicates which link is about to be removed
- After confirming, the dialog closes
- The link row for Story B disappears from the Links section without a full page reload
- The section shows an updated list; empty state is shown if no links remain
- No error message or orphaned UI element remains after deletion

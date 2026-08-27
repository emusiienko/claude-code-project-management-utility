---
id: TC-126
tags: @regression
story: STORY-007
status: Active
---

# TC-126: Opening an external-reference attachment opens its URL in a new tab

## Preconditions
- App is running at http://localhost:3000
- A story has an external-ref attachment pointing at a known URL

## Steps
1. Click the row's action for the external-ref attachment (e.g. "Open link")

## Expected Result
- No in-app viewer modal opens for this row
- A new browser tab opens, navigating to the stored `external_url`
- The original app tab remains on the Story slide-over, unaffected

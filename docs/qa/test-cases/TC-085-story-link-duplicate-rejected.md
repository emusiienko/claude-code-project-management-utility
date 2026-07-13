---
id: TC-085
tags: @regression
story: STORY-006
status: Active
---

# TC-085: Story slide-over — Duplicate story link attempt shows a conflict error

## Preconditions
- App is running at http://localhost:3000
- A link already exists: Story A → Story B with link type "depends on"
- Story A's slide-over is open
- Browser viewport set to 1280px wide

## Steps
1. In Story A's Links section, click "Add link"
2. Search for and select Story B as the target
3. Select the same outbound directional label ("depends on") that was used for the existing link
4. Submit the form

## Expected Result
- The form does not create a second link
- An inline error message appears informing the user that this link already exists (e.g. "This link already exists" or similar)
- The existing link row remains unchanged in the Links list
- No duplicate row appears

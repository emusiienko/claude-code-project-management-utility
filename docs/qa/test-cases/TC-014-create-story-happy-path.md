---
id: TC-014
tags: @smoke @regression
story: STORY-004
status: Active
---

# TC-014: Create story — happy path

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. Click "New story" button
2. In the Title field, type "My new story"
3. In the Content textarea, type "Some markdown content"
4. In the Status dropdown, select any available status value
5. Click the Save / Create button
6. Observe the result

## Expected Result
- Modal closes after clicking Save
- The stories table refreshes without a full page reload
- The new row "My new story" appears in the table with the chosen status badge and no label chips
- No error message is shown
- The "New story" button is again visible and functional

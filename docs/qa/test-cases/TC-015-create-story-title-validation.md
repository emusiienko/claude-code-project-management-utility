---
id: TC-015
tags: @regression
story: STORY-004
status: Active
---

# TC-015: Create story — empty title validation

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. Click "New story" button
2. Leave the Title field empty
3. Click the Save / Create button
4. Observe the result

## Expected Result
- Modal remains open — it does not close
- An inline validation error message appears below the Title field
- Error message is visually distinct (e.g. red text)
- No new story row appears in the table
- Other form fields retain their values (form is not reset)

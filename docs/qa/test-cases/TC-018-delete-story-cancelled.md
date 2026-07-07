---
id: TC-018
tags: @regression
story: STORY-004
status: Active
---

# TC-018: Delete story — cancel from confirmation dialog

## Preconditions
- App is running at http://localhost:3000
- At least one project exists with at least one story
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. Note the story count in the table
2. Click the Delete icon on any story row
3. Verify: confirmation dialog opens
4. Click the cancel / dismiss button on the dialog
5. Observe the result

## Expected Result
- Dialog closes after clicking cancel
- The story row remains in the table — nothing is deleted
- Story count in the table is unchanged
- The table is still fully interactive (Edit and Delete buttons respond)

---
id: TC-086
tags: @regression
story: STORY-006
status: Active
---

# TC-086: Story links disappear after the linked story is deleted

## Preconditions
- App is running at http://localhost:3000
- Story A and Story B are linked; Story A's slide-over shows the link to Story B
- Browser viewport set to 1280px wide

## Steps
1. Note the link to Story B visible in Story A's Links section
2. Close Story A's slide-over
3. Delete Story B from the Stories list (use the Delete button/action for Story B, confirm deletion)
4. Re-open Story A's slide-over

## Expected Result
- Story A's Links section no longer shows any link row referencing Story B
- The section shows an empty state or a shorter list — no broken/orphaned link row appears
- No error message or spinner remains in the Links section
- The overall Story slide-over loads without errors

---
id: tc-010
tags: @smoke @regression
story: STORY-004
status: Active
---

# tc-010: Empty state — project with no stories

## Preconditions
- App is running at http://localhost:3000
- A project exists that has zero stories

## Steps

### 1280px (Desktop — primary visual pass)
1. Set viewport to 1280px
2. Navigate to `/projects/:id` for the empty project
3. Verify: no table is rendered
4. Verify: a friendly empty-state message is displayed in place of the table
5. Verify: a "New story" call-to-action button is visible within the empty state area
6. Apply universal visual checklist

### 375px (Mobile)
7. Set viewport to 375px
8. Repeat steps 2–6

## Expected Result
- At all tested viewports: the table is absent when there are no stories
- An empty-state message is shown — not a blank page and not a loading spinner
- The "New story" button within the empty state is visible, accessible, and opens the create modal when clicked
- Universal visual checklist passes at both resolutions

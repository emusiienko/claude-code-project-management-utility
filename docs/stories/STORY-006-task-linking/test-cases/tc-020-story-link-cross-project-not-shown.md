---
id: tc-020
tags: @regression
story: STORY-006
status: Active
---

# tc-020: Story Add link form — stories from other projects do not appear in search results

## Preconditions
- App is running at http://localhost:3000
- At least two projects exist:
  - Project P with Story A and Story B
  - Project Q with Story C
- Story A's slide-over is open (from Project P)
- Browser viewport set to 1280px wide

## Steps
1. In Story A's Links section, click "Add link"
2. In the target story search field, type the title of Story C (which belongs to Project Q)
3. Observe the search results

## Expected Result
- Story C does not appear in the search results dropdown
- Only stories from the same project (Project P) appear as valid targets
- If no matching same-project stories are found, an empty state or "no results" message is shown
- No error message or crash occurs from the search attempt

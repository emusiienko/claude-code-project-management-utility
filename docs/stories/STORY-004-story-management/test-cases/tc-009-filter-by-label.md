---
id: tc-009
tags: @regression
story: STORY-004
status: Active
---

# tc-009: Filter bar — filter by label key and value

## Preconditions
- App is running at http://localhost:3000
- At least one project exists with:
  - Story A: label key "env", value "production"
  - Story B: label key "env", value "staging"
  - Story C: no labels
- Navigate to `/projects/:id` at 1280px viewport

## Steps
1. In the filter bar, type "env" in the Label key field (leave Label value empty)
2. Observe the table
3. Clear the Label key field; type "env" in Label key and "production" in Label value
4. Observe the table
5. Clear both label fields; type "nonexistent" in the Label key field
6. Observe the table
7. Clear all filters
8. Observe the table

## Expected Result
- Filtering by label key "env" alone: shows Story A and Story B; Story C is hidden
- Filtering by key "env" + value "production": shows only Story A
- Filtering by a key that no story has: table shows empty state or zero rows (no error)
- Clearing all filters: all three stories are shown again
- Filters can be used independently from the status filter (status filter is unaffected)

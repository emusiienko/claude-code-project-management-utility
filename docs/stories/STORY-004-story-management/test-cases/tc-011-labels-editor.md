---
id: tc-011
tags: @regression
story: STORY-004
status: Active
---

# tc-011: Labels editor — add and remove labels

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Navigate to `/projects/:id` at 1280px viewport
- Open the "New story" modal (or Edit modal for a story with existing labels)

## Steps — Adding labels
1. In the Labels editor section, locate the control to add a new key-value pair
2. Enter key "env" and value "production" in the first pair
3. Add a second label: key "team", value "backend"
4. Verify: both label pairs are visible in the editor
5. Verify: each added pair shows a remove / delete control

## Steps — Removing a label
6. Click the remove control on the "env" / "production" pair
7. Verify: the "env" pair disappears from the editor
8. Verify: the "team" / "backend" pair remains

## Steps — Saving
9. Fill in the Title field ("Label test story") if not already filled
10. Click Save
11. Locate the new row in the table
12. Verify: the row shows one label chip "team: backend" (or equivalent rendering)
13. Verify: the removed "env" label is not present

## Expected Result
- Labels editor allows adding multiple key-value pairs
- Each pair shows a visible remove control
- Removing a pair removes only that pair — other pairs are unaffected
- Labels saved with the story appear as chips in the table row
- Labels explicitly removed before saving do not appear on the row

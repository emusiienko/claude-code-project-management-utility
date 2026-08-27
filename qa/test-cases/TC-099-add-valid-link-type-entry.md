---
id: TC-099
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-099: Adding a new valid link_types entry with all three fields saves correctly

## Preconditions

- App is running at http://localhost:3000
- System Settings page is open at `/settings`
- Viewport: 1280px

## Steps

1. Navigate to `/settings`, scroll to the `link_types` section
2. Click the "Add" button (or equivalent) to add a new entry
3. In the new row, fill in:
   - Value: `context`
   - Outbound label: `provides context for`
   - Inbound label: `has context from`
4. Click Save (or equivalent confirmation action)
5. Observe the result

## Expected Result

- The new entry appears in the list after saving: `context` / `provides context for` / `has context from`
- No error message is shown
- The page does not crash or show a "Something went wrong" overlay
- Refreshing the page preserves the new entry

## Cleanup

- Remove the `context` entry after the test to restore the default state

---
id: TC-101
tags: @regression
story: STORY-020
status: Active
---

# TC-101: Saving a link_types entry whose Value duplicates an existing entry is rejected

## Preconditions

- App is running at http://localhost:3000
- System Settings page is open at `/settings`
- The default four entries exist: `depends-on`, `dependent`, `created-by`, `creates`
- Viewport: 1280px

## Steps

1. Navigate to `/settings`, scroll to the `link_types` section
2. Click Add to create a new entry
3. Fill **Value**: `depends-on` (duplicating an existing entry); fill **Outbound label**: `copy`; fill **Inbound label**: `copied`
4. Click Save
5. Observe the result

## Expected Result

- The entry is **not** saved
- A visible error message appears (inline or above Save): "link_types values must be unique" or equivalent
- The list still shows the original `depends-on` entry unchanged
- No page crash or white screen

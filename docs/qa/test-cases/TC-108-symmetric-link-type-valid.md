---
id: TC-108
tags: @regression
story: STORY-020
status: Active
---

# TC-108: A link_types entry with identical outbound and inbound labels is accepted and rendered correctly

## Preconditions

- App is running at http://localhost:3000
- System Settings page is open at `/settings`
- Viewport: 1280px

## Steps

1. Navigate to `/settings`, scroll to the `link_types` section
2. Click Add to create a new entry
3. Fill: Value `related-to`, Outbound label `related to`, Inbound label `related to` (same text for both)
4. Click Save
5. Navigate to a story with tasks; open Task Detail for a task and add a link using `related-to`
6. Observe the link badge from both the source and target task detail modals

## Expected Result

- The entry is saved without any error — same outbound and inbound is valid
- The link picker includes "related to" as both the outbound and inbound option for `related-to`
- In the source task detail: the badge shows "related to" (outbound)
- In the target task detail: the badge shows "related to" (inbound — same string, but correctly fetched from the entry)
- No crash or unexpected behavior

## Cleanup

- Delete the `related-to` entry from system settings
- Delete the task link created during this test

---
id: TC-109
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-109: Other dictionary sections in Settings are unaffected and still use single-field rows

## Preconditions

- App is running at http://localhost:3000
- System Settings page is open at `/settings`
- Viewport: 1280px

## Steps

1. Navigate to `/settings`
2. Observe each of the following dictionary sections: `task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `participant_roles`
3. Compare their editor layout to the `link_types` section

## Expected Result

- `task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `participant_roles` all render with a **single-field** per entry row (same as before this story)
- `link_types` alone has the three-field (Value / Outbound / Inbound) row layout
- Adding and removing entries in any single-field dictionary still works as before
- The three-field editor does not appear in any other dictionary section

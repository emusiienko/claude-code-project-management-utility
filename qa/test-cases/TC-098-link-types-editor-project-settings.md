---
id: TC-098
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-098: Project Settings page renders link_types as a three-column editor

## Preconditions

- App is running at http://localhost:3000
- At least one project exists
- Navigate to the project ID of any existing project

## Steps

1. Set viewport to 1280px wide
2. Navigate to `/projects/:id/settings` for any existing project
3. Scroll to the `link_types` section

## Expected Result

- The `link_types` section renders each entry as a row with three editable fields: **Value**, **Outbound label**, **Inbound label** — identical layout to the System Settings page
- If no project-level override is set, the inherited system defaults are displayed (four entries)
- Other dictionary sections still use the single-field row layout (unaffected)
- No horizontal scrollbar; no content overlap

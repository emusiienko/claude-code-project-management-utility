---
id: TC-097
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-097: System Settings page renders link_types as a three-column editor

## Preconditions

- App is running at http://localhost:3000
- At least one `link_types` entry exists in the system settings (default seed provides four)

## Steps

1. Set viewport to 1280px wide
2. Navigate to `/settings`
3. Scroll to the `link_types` section
4. Observe how `link_types` entries are displayed

## Expected Result

- The `link_types` section renders each entry as a row with three editable fields: **Value**, **Outbound label**, **Inbound label**
- All four default entries are visible: `depends-on`, `dependent`, `created-by`, `creates`
- Each row shows correct values in each column:
  - `depends-on` → Value: "depends-on", Outbound: "depends on", Inbound: "dependent"
  - `dependent` → Value: "dependent", Outbound: "dependent", Inbound: "depends on"
  - `created-by` → Value: "created-by", Outbound: "created by", Inbound: "creates"
  - `creates` → Value: "creates", Outbound: "creates", Inbound: "created by"
- Other dictionary sections (`task_statuses`, `task_types`, etc.) still use the single-field row layout (unaffected)
- No horizontal scrollbar appears; no content overlap

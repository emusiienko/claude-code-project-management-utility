---
id: TC-131
tags: @regression
story: STORY-007
status: Inactive
---

> **Inactive** — the Type dropdown and the `attachment_types` dictionary were removed entirely by STORY-021 (replaced with a mandatory Title field). Superseded by TC-133–TC-138.

# TC-131: Attachment Type dropdown is populated from the project's effective attachment_types

## Preconditions
- App is running at http://localhost:3000
- The project's Settings has a known set of values configured for `attachment_types` (system default plus, optionally, a project-level override)

## Steps
1. Open a project's Settings screen and note the current effective `attachment_types` values
2. Navigate to that project's Stories, open a story slide-over, click "Add attachment"
3. Open the Type dropdown in the upload panel

## Expected Result
- The Type dropdown lists exactly the values from the project's effective `attachment_types` — no hardcoded values, no missing entries, no duplicates
- If the project has a project-level override for `attachment_types`, the dropdown reflects the overridden list, not the system default
- The dropdown has no empty/blank selectable option other than an unselected placeholder (if present)

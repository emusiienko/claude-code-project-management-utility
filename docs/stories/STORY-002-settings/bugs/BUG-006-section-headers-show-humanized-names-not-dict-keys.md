---
id: BUG-006
story: STORY-002
severity: minor
status: wont-fix
assignee: frontend-developer
---

# BUG-006: Dictionary section headers display humanized names instead of API key names

## Description

The System Settings screen displays dictionary section headers in human-readable title case ("Task Statuses", "Task Types", etc.) rather than the exact dictionary key names used in the API (`task_statuses`, `task_types`, etc.). TC-001 explicitly requires section header labels to match the dictionary key names.

## Steps to Reproduce

1. Navigate to `http://localhost:3000/settings`
2. Observe the heading of each of the six dictionary sections

## Expected Result

Section headers match the dictionary key names: `task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`

## Actual Result

Section headers display as: "Task Statuses", "Task Types", "Story Statuses", "Attachment Types", "Link Types", "Participant Roles"

## Additional Info

TC-001 check: "Each section header label matches the dictionary key name (`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`)".

Note: this may be an intentional design choice (human-readable labels are more user-friendly). If the product owner confirms that human-readable labels are acceptable, TC-001 should be updated to reflect the intended behavior, and this bug should be marked `wont-fix`.

## Resolution

Showing human-readable section header names is intentional design. Snake_case API keys are not appropriate for UI labels. TC-001 has been updated to expect human-readable labels ("Task Statuses", "Task Types", etc.).

---
id: TC-137
tags: @smoke @regression
story: STORY-021
status: Active
---

# TC-137: System and Project Settings screens show five dictionary editors, with no attachment_types editor

## Preconditions
- App is running at http://localhost:3000
- At least one project exists

## Steps
1. Navigate to `/settings` (System Settings)
2. Count and identify the dictionary editor sections shown
3. Navigate to `/projects/:projectId/settings` (Project Settings) for an existing project
4. Count and identify the dictionary editor sections shown

## Expected Result
- Both System Settings and Project Settings show exactly five dictionary editors: `task_statuses`, `task_types`, `story_statuses`, `link_types`, `participant_roles`
- No `attachment_types` editor/section appears anywhere on either screen
- The remaining five editors render and behave normally (no layout gap, no broken spacing where the sixth section used to be)

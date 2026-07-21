---
id: tc-011
tags: @regression
story: STORY-022
status: Active
---

# tc-011: Project with no settings overrides — clicking its name lands on Settings showing inherited defaults

## Preconditions
- App is running at http://localhost:3000
- A project exists that has never had any project-level settings overrides configured

## Steps
1. Navigate to `/projects`.
2. Click the name of a project that has no project-level overrides.
3. Verify navigation lands on that project's Settings view (`/projects/:id/settings`).
4. Verify all dictionary values shown are inherited from System Defaults, with whatever inherited-value indication the Settings view already uses (no crash, no blank/broken sections).

## Expected Result
- The Settings view for a project with no overrides yet loads correctly and shows values inherited from system defaults.
- This pre-existing inherited-state behavior is unaffected by the landing-destination change — the only difference is that clicking the project name now reaches this view directly instead of Stories.

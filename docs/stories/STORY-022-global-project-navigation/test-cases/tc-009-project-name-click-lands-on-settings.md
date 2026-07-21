---
id: tc-009
tags: @smoke @regression
story: STORY-022
status: Active
---

# tc-009: Projects Management page — clicking a project's name navigates to Settings

## Preconditions
- App is running at http://localhost:3000
- At least one project exists

## Steps
1. Navigate to `/projects`.
2. Locate a project row and click its name (the click target that previously navigated to Stories).
3. Verify the app navigates to `/projects/:id/settings` for that project — not `/projects/:id/stories`.
4. Verify the Project Settings view renders (dictionary overrides section, etc.).
5. From within the project, use the project's sub-navigation tabs to reach Stories.
6. Verify the Stories view loads normally.
7. Use the sub-navigation tabs to reach Board, then Milestones.
8. Verify both load normally.

## Expected Result
- Clicking a project's name on `/projects` lands on that project's Settings view (`/projects/:id/settings`), not Stories.
- Once inside the project, Stories, Board, and Milestones remain fully reachable via the existing sub-navigation tabs — no functionality is removed, only the initial landing destination changed.

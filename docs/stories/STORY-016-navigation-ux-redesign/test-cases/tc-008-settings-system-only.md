---
id: tc-008
tags: @smoke @regression
story: STORY-016
status: Active
---

# tc-008: /settings shows only System Defaults — no Project Overrides tab

## Preconditions
App is running.

## Steps
1. Navigate to http://localhost:3000/settings.
2. Verify no sidebar is rendered.
3. Verify no sub-nav bar is rendered.
4. Verify no "Project Overrides" tab is visible.
5. Verify the page shows six dictionary cards (Task Statuses, Task Types, Story Statuses, Attachment Types, Link Types, Participant Roles).
6. Click the Settings button in the top bar. Verify it navigates to /settings.

## Expected Result
- /settings renders without sidebar and without sub-nav.
- No "Project Overrides" tab present — only system-level dictionaries.
- "Settings" top-bar button navigates to /settings.

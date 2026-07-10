---
id: BUG-005
story: STORY-016
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-005: Sidebar shows redundant "Projects" combobox above the project list

## Description

The sidebar has both a `<select>` combobox labeled "Projects" and a list of projects below it. The list already serves navigation — the combobox is redundant.

## Steps to Reproduce

1. Open the app in a browser.
2. Select any project to enter the project context (sidebar visible).
3. Observe the top section of the sidebar.

## Expected Result

Only the project list is shown for navigation. The combobox is removed.

## Actual Result

Both a "Projects" labeled combobox and a project list are displayed in the sidebar, duplicating the navigation affordance.

## Additional Info

<!-- logs, screenshots, environment details -->

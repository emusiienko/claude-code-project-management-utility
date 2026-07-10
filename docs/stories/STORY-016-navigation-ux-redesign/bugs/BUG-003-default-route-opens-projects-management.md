---
id: BUG-003
story: STORY-016
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-003: Default route opens /projects management page instead of project context

## Description

When no project is selected (e.g. fresh load with no `app:last_project_id` in localStorage, or first-time user), the app opens the `/projects` full-page management screen. It should instead open a "Choose a project" placeholder inside the `AppShell` (with sidebar visible). The `/projects` management page should only appear when there are no projects at all.

## Steps to Reproduce

1. Open the app in a browser.
2. Clear localStorage (remove `app:last_project_id` if present) — or use a fresh browser profile.
3. Navigate to the root URL `/`.
4. Observe which screen is shown.

## Expected Result

Default state shows `AppShell` with sidebar and a centered "Choose a project" placeholder. If there are no projects at all, show the `/projects` management page.

## Actual Result

The app opens the `/projects` full-page management screen even when projects exist, bypassing the `AppShell` and leaving the sidebar not visible.

## Additional Info

<!-- logs, screenshots, environment details -->

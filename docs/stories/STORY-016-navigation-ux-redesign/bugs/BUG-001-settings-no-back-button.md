---
id: BUG-001
story: STORY-016
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-001: /settings page has no back/close button

## Description

Navigating to `/settings` (Global Settings) via the top-bar gear button leaves the user with no way to go back. There is no close button, back link, or breadcrumb. The user must use the browser back button.

## Steps to Reproduce

1. Open the app in a browser.
2. Click the gear (⚙) icon in the top navigation bar.
3. Observe the `/settings` page — look for any back, close, or breadcrumb navigation affordance.

## Expected Result

A visible "← Back" or "✕ Close" affordance on the `/settings` page that returns to the previous location.

## Actual Result

The `/settings` page has no navigation affordance to return to the previous screen. The user must use the browser's back button.

## Additional Info

<!-- logs, screenshots, environment details -->

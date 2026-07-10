---
id: BUG-006
story: STORY-016
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-006: Sidebar collapse button — wrong position, wrong icon, sidebar too narrow

## Description

Three related layout issues with the sidebar collapse/expand toggle:

(a) The collapse/expand toggle button is not vertically centered — it sits near the top of the sidebar edge.

(b) The icon uses a single arrow (`◄`/`▶`); the expected icon is triple arrows (`<<<`/`>>>`).

(c) The sidebar is too narrow — the collapse button is too close to the project list content, leaving inadequate spacing.

## Steps to Reproduce

1. Open the app in a browser.
2. Select any project to enter the project context (sidebar visible).
3. Observe the collapse/expand toggle button on the sidebar edge:
   - Note its vertical position relative to the sidebar height.
   - Note the icon used.
   - Note the spacing between the sidebar content and the toggle button.

## Expected Result

- Toggle button is vertically centered on the sidebar edge.
- Icon is `<<<` (collapsed) / `>>>` (expanded).
- Sidebar is slightly wider so content and the toggle button have adequate spacing.

## Actual Result

- Toggle button appears near the top, not vertically centered.
- Icon is a single arrow (`◄`/`▶`).
- Sidebar is too narrow, with the toggle crowding the project list content.

## Additional Info

<!-- logs, screenshots, environment details -->

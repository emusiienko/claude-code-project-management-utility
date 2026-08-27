---
id: TC-030
tags: @smoke @regression
story: STORY-016
status: Active
---

# TC-030: Config overlay shows only System Defaults — no Project Overrides tab

> Updated 2026-07-22 (STORY-022 reconcile): the `/settings` route no longer exists — system-level configuration is now reached via the global "Config" entry in the top bar, which opens as a slide-over overlay on top of the current main view. The main view (including its sidebar/sub-nav, if any) stays mounted and dimmed underneath — the former "no sidebar / no sub-nav rendered" framing no longer applies, since Config is an overlay, not a page.

## Preconditions
App is running.

## Steps
1. From any screen, click the "Config" button in the top bar.
2. Verify the Config overlay opens as a slide-over panel above the current main view, and the URL does not change.
3. Verify no "Project Overrides" tab or section is visible in the overlay — only system-level dictionaries.
4. Verify the overlay shows the System Settings dictionary cards (Task Statuses, Task Types, Story Statuses, Attachment Types, Link Types, Participant Roles).
5. Dismiss the overlay (X button). Verify it closes and the underlying main view is fully interactive again, unchanged.
6. Switch to Sessions mode and click "Config" again. Verify it opens the same overlay — Config is reachable from anywhere, not tied to a route or mode.

## Expected Result
- Config is reached via the top-bar "Config" button, not a `/settings` URL — the URL never changes when the overlay opens or closes.
- The Config overlay shows only system-level dictionaries — no "Project Overrides" tab or project-scoped view is present.
- The underlying main view stays mounted and dimmed underneath the overlay while it's open.
- The "Config" top-bar button opens the same overlay from any mode/screen.

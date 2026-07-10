---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-002: Top bar + app switcher

## What to implement

Build the top bar that replaces the removed flat nav (`Agent Utility | Projects | Sessions | Settings`),
rendered in the flat root layout above all content.

- Left: an app-switcher combobox with two entries, `Task Manager` and `Sessions`. It shows the mode
  matching the current location (`Task Manager` for project-scoped and `/projects` routes, `Sessions`
  for `/sessions`). Selecting an entry replaces the entire content area by navigating to that app's
  view. Switching to Task Manager returns to the last active project and sub-nav tab; switching to
  Sessions goes to `/sessions`.
- Right: a `⚙ Settings` text button that navigates to `/settings`. It is shown only in Task Manager
  mode and hidden in Sessions mode.

## Scope

Frontend top-bar UI in the flat root layout. No backend, no API contract changes.

## Dependencies

TASK-001

## Acceptance Criteria

- [ ] The flat nav bar is gone; the top bar shows an app-switcher combobox on the left and (in Task
      Manager mode) a `⚙ Settings` button on the right
- [ ] The app switcher displays `Task Manager` on project-scoped and `/projects` routes and `Sessions`
      on `/sessions`
- [ ] Selecting `Sessions` replaces the content area with the Sessions view; selecting `Task Manager`
      returns to the last active project and sub-nav tab
- [ ] The `⚙ Settings` button navigates to `/settings` and is hidden while in Sessions mode

## Intended ADR

Contributes to the planned navigation-model ADR. No ADR file created at this stage.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
Created `frontend/src/app/TopBar.tsx` — a self-contained top bar component that derives the current app mode from the pathname and renders a `<select>` app-switcher on the left and a Settings `<button>` on the right. Updated `RootLayout.tsx` to mount `TopBar` in place of the `#topbar-region` placeholder.

**Deviations from plan**:
None. The implementation follows the plan exactly.

**Technical decisions made**:
- App mode is derived live from `useLocation().pathname` inside `TopBar` rather than stored in state. This keeps the switcher always in sync with the URL without any risk of stale state.
- A native `<select>` is used for the app switcher instead of a custom dropdown. This is keyboard-accessible, requires no extra dependencies, and satisfies the combobox shape described in the task without adding complexity.
- The last Task Manager URL is persisted in localStorage under the key `app:last_task_manager_url` (a `useEffect` tracks every pathname change while in Task Manager mode). When switching back from Sessions, the user is returned to that exact URL rather than a simplified project root. If no URL exists yet, the fallback is `/` which RootRedirect resolves via `LAST_PROJECT_KEY`.
- `TopBar` is placed in `src/app/` (not `src/shared/`) because it uses `useLocation` and `useNavigate` directly — the conventions explicitly forbid those hooks in shared components.

**Code locations**:
- `frontend/src/app/TopBar.tsx` — new top bar component; exports `TopBar`; `LAST_TASK_MANAGER_URL_KEY` constant defined here
- `frontend/src/app/RootLayout.tsx` — updated to mount `<TopBar />` (placeholder `#topbar-region` div removed)

**Technical debt noted**:
The old `frontend/src/app/Layout.tsx` (flat nav bar from STORY-004) is no longer referenced by the router but still exists in the source tree. It is dead code that should be deleted when STORY-016 is fully accepted to avoid confusion. Removing it is out of scope for this task — it will be addressed during reconcile.

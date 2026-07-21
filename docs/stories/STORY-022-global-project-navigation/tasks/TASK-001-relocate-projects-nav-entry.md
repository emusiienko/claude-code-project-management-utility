---
status: Done
assignee: frontend-developer
story: STORY-022
---

# TASK-001: Relocate the Projects navigation entry to the global top bar

## What to implement
Move the single navigation entry point for project management from the Task
Manager left sidebar to the persistent top bar, so it is reachable identically
from every app mode.

**Add a global Projects entry to the top bar:**
- Place it in the top bar's right-side region, alongside the existing Settings
  action.
- It must be present in both Task Manager mode and Sessions mode. Today the
  right-side region renders only in Task Manager mode; make it render in both so
  the Projects entry is always visible. Its position and behavior must be
  identical across modes and unaffected by route state (an open Story slide-over
  or Task Detail modal).
- Clicking it navigates to the existing Projects management page at `/projects`;
  that page's own behavior is unchanged.
- It shows an active/current-page indication when the user is already on
  `/projects`, using the app's established router-driven active-state pattern
  (the same `NavLink` `isActive` → `aria-current="page"` approach used by the
  project sub-nav tabs and the sidebar project list). Do not introduce a new
  active-state mechanism.
- It is keyboard-focusable with a visible focus indicator matching the rest of
  the top bar's controls.

**Remove the sidebar entry:**
- Remove the `Manage Projects` link from the Task Manager left sidebar, along
  with any sub-component and icon import that exist solely to support it, so
  exactly one path to project management remains. Leave the sidebar's project
  list and collapse toggle unchanged.

The existing Settings action stays gated to Task Manager mode as it is today —
this task does not change Settings' visibility or behavior.

## Scope
Frontend only — the persistent top bar and the Task Manager left sidebar in
`frontend/src/app/`. No backend, no API contract, no data model changes.

## Dependencies
None

## Acceptance Criteria
- [ ] A Projects entry is visible in the persistent top bar in both Task Manager
      and Sessions modes, positioned near the Settings action
- [ ] Clicking the Projects entry navigates to `/projects`; the Projects page's
      list/create/edit/delete behavior is unchanged
- [ ] The Manage Projects link is removed from the Task Manager left sidebar;
      there is no second, mode-dependent path to project management
- [ ] The Projects entry shows current-page indication (via `aria-current="page"`)
      when on `/projects`, consistent with other current-page indicators in the app
- [ ] The Projects entry is keyboard-accessible with a visible focus indicator
      consistent with the rest of the top bar
- [ ] Navigating to Projects while a Story slide-over or Task Detail modal is open
      dismisses it and updates the URL to `/projects`, as normal top-level
      navigation (no bespoke dismissal logic added)
- [ ] The Projects entry's position and behavior are identical in Task Manager and
      Sessions modes; switching modes does not hide or move it
- [ ] The existing Settings action remains Task-Manager-only and otherwise unchanged

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-21

**What was done**:
- Added a global "Projects" entry to `TopBar`'s right-side region, rendered unconditionally in both Task Manager and Sessions modes (the region previously rendered only in Task Manager mode, gated by `mode === "task-manager"`). It uses React Router's `NavLink` with a `FolderKanban` icon, navigating to `/projects`.
- Reused the existing router-driven active-state pattern (`NavLink`'s `isActive` render-prop → `aria-current="page"` is set automatically by `NavLink`, same mechanism as `ProjectShell`'s sub-nav tabs and the sidebar's project list) — no new active-state or focus mechanism introduced. Focus ring reuses the top bar's existing `focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2` classes.
- The existing "Config" (Settings) button stays gated to Task Manager mode only, unchanged in behavior — it now sits next to the new Projects link inside the same right-side flex container.
- Removed the `ManageProjectsLink` sub-component, its `Link` and `Settings` icon imports, and its render call from `ProjectSidebar`. The sidebar's project list and collapse/expand toggle are untouched. Updated the component's JSDoc to note that project management is now reached via the top bar.
- No changes were needed to dismiss open Story slide-overs / Task Detail modals on navigation to `/projects` — that falls out of ordinary React Router top-level navigation, per the plan's explicit "no manual dismissal logic" constraint.

**Deviations from plan**: None. Implementation followed the task and implementation plan as written.

**Technical decisions made**:
- Used `lucide-react`'s `FolderKanban` icon for the new Projects link to avoid reusing `Settings` (already used for the Config button) for a visually distinct affordance; purely cosmetic, no behavioral implication.
- Wrapped the Projects `NavLink` and the conditional Config button in a shared `<div className="flex items-center gap-1">` inside the top bar's right region so spacing stays consistent whether one or two items are visible.

**Code locations**:
- `frontend/src/app/TopBar.tsx` — global Projects `NavLink` added; right-side region now always renders; Config button unchanged, still gated to Task Manager mode.
- `frontend/src/app/ProjectSidebar.tsx` — `ManageProjectsLink` sub-component, its render call, and its now-unused `Link`/`Settings` imports removed.

**Technical debt noted**:
- `frontend/src/app/ProjectSidebar.test.tsx` has two tests ("renders the Manage Projects link" pattern — specifically "still shows Manage Projects link when no projects exist"; the first "renders the Manage Projects link" test also asserts the removed link) that now fail because they assert the old sidebar-link behavior. Per the implementation plan's own "Constraints & Gotchas" section, updating these (plus `TopBar.test.tsx` and adding coverage for the new global entry) is explicitly assigned to TASK-002 (qa-automation), which depends on this task. Verified via a full `npx vitest run`: 199/201 tests pass; the 2 failures are exactly these two pre-existing assertions, no other regressions. `npx tsc --noEmit` passes clean.

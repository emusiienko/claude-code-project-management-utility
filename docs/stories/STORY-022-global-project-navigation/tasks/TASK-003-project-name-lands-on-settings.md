---
status: Done
assignee: frontend-developer
story: STORY-022
---

# TASK-003: Change the Projects Management project-name landing destination to Settings

> Refined by TASK-004 (2026-07-21): the destination URL below (`/projects/:id/settings`)
> is unchanged, but TASK-004 relocates that route to render Project Settings as a
> standalone screen rather than a per-project sub-navigation tab. This task's work and
> report stand as-is.

## What to implement
On the Projects Management page (`/projects`), clicking a project's name currently
navigates into that project and lands on its Stories view. Change that single click
target so it lands on the project's **Settings** view (`/projects/:id/settings`)
instead.

- Retarget only the project-name click on the Projects Management list. Set the
  Settings destination explicitly at that click target.
- Do not change the Task Manager sidebar's project selection (combobox and project
  list): it must continue to land on the project's Stories view.
- Do not change the router's default landing for a bare project URL — the sidebar
  relies on that default and must remain unaffected. Set the new destination at the
  click target, not by repointing the shared default.
- No functionality is removed: Stories, Board, and Milestones stay reachable through
  the project's existing sub-navigation tabs once inside the project.

## Scope
Frontend only — the project-name entry in the Projects Management list
(`frontend/src/features/projects/`). No backend, no API contract, no data model,
and no change to the shared router default or the Task Manager sidebar.

## Dependencies
None (independent of TASK-001)

## Acceptance Criteria
- [x] Clicking a project's name on `/projects` navigates to `/projects/:id/settings`
- [x] The Task Manager sidebar's project combobox and project list still navigate to
      the project's Stories view when a project is selected
- [x] Stories, Board, and Milestones remain reachable via the project sub-navigation
      tabs after landing on Settings — no functionality removed
- [x] Clicking a project with no settings overrides lands on its Settings view showing
      values inherited from system defaults (pre-existing inherited state unchanged)

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-21
**What was done**: Changed the project-name `Link` in the Projects Management list
from `/projects/${project.id}` (which resolved to Stories via the `ProjectShell`
index redirect) to an explicit `/projects/${project.id}/settings`. This is the only
click target touched. Verified by search across `frontend/src` that no other
navigation path was affected: the Task Manager sidebar (`ProjectSidebar.tsx`) already
calls `navigate(`/projects/${projectId}/stories`)` explicitly and is untouched, and
the router's index redirect for a bare `/projects/:projectId` URL
(`<Navigate to="stories" replace />` in `router.tsx`) was left unchanged, so the
sidebar's reliance on that default still holds. Once inside a project via Settings,
the existing `ProjectShell` sub-nav tabs (Stories/Board/Milestones/Settings) are
unaffected, so no functionality was removed. A project with no settings overrides
was already handled by the pre-existing `ProjectSettingsPage`/`EffectiveSettingsPanel`
inherited-defaults rendering — no changes were needed there since this task only
changes the landing route, not the Settings page itself.
**Deviations from plan**: None.
**Technical decisions made**: None beyond what the task specified — a one-line change
to the `Link`'s `to` prop, no new component, no new pattern.
**Code locations**: `frontend/src/features/projects/components/ProjectList.tsx` (the
`Link` inside the Name column of the project row).
**Technical debt noted**: None from this task. Test coverage for this new destination
is owned by qa-automation (TASK-002, which depends on this task); no test files were
added or modified here per role convention. Baseline `npx vitest run` (201/201 passing)
was captured before this change; `npx vitest run src/features/projects` (this task's
sole scope) still passes cleanly (7/7) after the change, and `npm run build` (includes
`tsc --noEmit`) passed cleanly. A full-suite re-run after this change showed 2 failures
in `src/app/ProjectSidebar.test.tsx` ("renders the Manage Projects link" / "still shows
Manage Projects link when no projects exist") — these are pre-documented in the
implementation plan as expected fallout of the parallel TASK-001 (which removed that
link from the sidebar) and are explicitly assigned to TASK-002 to update; `git status`
confirms `ProjectSidebar.tsx` was modified by TASK-001, not by this task's change to
`ProjectList.tsx`, so this is not a regression introduced here.

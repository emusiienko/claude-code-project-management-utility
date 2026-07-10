---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-004: Project sub-nav + ProjectShell

## What to implement

Build the ProjectShell layer that wraps all project-scoped content.

- Render a horizontal sub-navigation bar with four tabs — `Stories`, `Board`, `Milestones`,
  `Settings` — mapping to `/projects/:id/stories`, `/projects/:id/board`, `/projects/:id/milestones`,
  and `/projects/:id/settings`. The tab matching the current location is visually highlighted.
- The shell hosts a nested outlet where the active tab's content (added in later tasks) renders.
- Handle an unknown project ID: when the `:id` in the URL does not correspond to an existing project,
  render an inline "Not found" message with a link back to `/projects` instead of the tab content.
- The Milestones tab renders the existing placeholder screen (STORY-012 fills it in); this task only
  wires the tab and route to that placeholder with no regression.

## Scope

Frontend ProjectShell layout and sub-nav inside AppShell. No backend, no API contract changes.

## Dependencies

TASK-003

## Acceptance Criteria

- [ ] When a project is active, a sub-nav bar shows the four tabs (Stories, Board, Milestones,
      Settings) with the active tab highlighted
- [ ] Each tab navigates to its corresponding `/projects/:id/...` route
- [ ] Visiting a `/projects/:id/...` route with a non-existent project ID shows an inline "Not found"
      message with a link back to `/projects`
- [ ] The Milestones tab navigates to `/projects/:id/milestones` and renders the existing placeholder
      screen with no regression

## Intended ADR

Contributes to the planned navigation-model ADR. No ADR file created at this stage.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
Replaced the empty `ProjectShell.tsx` placeholder with a fully functional per-project sub-nav shell. Created a new shared hook `useProjectDetail` that fetches a single project by ID and distinguishes 404 (not found) from other errors. `ProjectShell` reads `projectId` from route params, validates the project via `useProjectDetail`, and renders three possible states: loading spinner, inline "Not found" message with a `/projects` link, generic load error, or the four-tab sub-nav + `<Outlet />`. The sub-nav uses React Router's `NavLink` for automatic active-tab detection and highlight. Tabs are defined as a static array (`SUB_NAV_TABS`) to keep the JSX declarative and the label/segment mapping in one place.

**Deviations from plan**:
None. The implementation follows the plan exactly.

**Technical decisions made**:
- Used `NavLink` (not `Link`) for sub-nav tabs so active-tab highlighting is handled automatically by the router without any manual pathname comparison.
- Created `useProjectDetail` as a shared hook (`src/shared/hooks/`) rather than a features-scoped hook because it is consumed by the shell layer (`src/app/`), which sits above the feature boundary.
- Used `retry: (failureCount, error) => ...` to disable TanStack Query retries on 404 responses — retrying a not-found project ID wastes network calls and delays the "Not found" render.
- Added a generic `ProjectLoadError` component separate from `ProjectNotFound` to give a distinct message for server/network failures vs. missing resources, matching the conventions convention of handling all three states (loading, error, empty/not-found).
- `PageLoader` is reused for the loading state to keep spinner behavior consistent with all other data-fetching components in the app.

**Code locations**:
- `frontend/src/app/ProjectShell.tsx` — updated with sub-nav, outlet, and not-found/error states
- `frontend/src/shared/hooks/useProjectDetail.ts` — new shared hook for single-project fetching with 404 discrimination

**Technical debt noted**:
None.

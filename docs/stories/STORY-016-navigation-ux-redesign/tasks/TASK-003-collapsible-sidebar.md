---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-003: Collapsible project sidebar

## What to implement

Build the collapsible left sidebar rendered by AppShell in Task Manager mode.

- Contents, top to bottom: a project combobox that switches the active project; a list of all
  projects with the active one visually highlighted; a `⚙ Gestisci progetti` link at the bottom that
  navigates to `/projects`.
- A collapse/expand toggle on the sidebar edge (`◄` / `▶`). When collapsed, only the toggle is
  visible and the main content fills the full width. The collapsed/expanded state persists in browser
  local storage via `useLocalStorage`.
- Selecting a project (combobox or list) navigates into that project and updates the last-visited
  project ID in local storage so the `/` redirect and app-switch return target stay correct.
- Reuse the existing cross-feature project-list data source; do not add a new project fetch.

## Scope

Frontend sidebar UI inside AppShell. No backend, no API contract changes.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] The sidebar shows a project combobox, a list of all projects with the active one highlighted,
      and a `⚙ Gestisci progetti` link navigating to `/projects`
- [ ] The collapse/expand toggle (`◄`/`▶`) collapses and expands the sidebar; when collapsed only the
      toggle is visible and main content fills the full width
- [ ] The collapsed/expanded state persists across reloads via local storage
- [ ] Selecting a project navigates into that project and records it as the last-visited project
- [ ] With no projects, the sidebar shows an empty project list and still shows the `⚙ Gestisci
      progetti` link

## Intended ADR

Contributes to the planned navigation-model ADR. No ADR file created at this stage.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
Created `ProjectSidebar.tsx` in `frontend/src/app/` and updated `AppShell.tsx` to mount it. The sidebar renders a project combobox (select), a scrollable project list with the active item highlighted via `aria-current="page"`, a "Gestisci progetti" link at the bottom, and a collapse/expand toggle button (`◄`/`▶`) pinned to the right edge via absolute positioning. Collapsed state is persisted via `useLocalStorage` under key `app:sidebar_collapsed`. Project selection (combobox or list button) navigates to `/projects/:id/stories` and writes the project ID to localStorage via the existing `LAST_PROJECT_KEY` exported from `RootRedirect.tsx`.

**Deviations from plan**:
None. All acceptance criteria met as specified.

**Technical decisions made**:
- `ProjectSidebar` is split into four private sub-components (`ProjectCombobox`, `ProjectList`, `ManageProjectsLink`, `CollapseToggle`) inside the same file — all are internal helpers and do not warrant separate files.
- `useProjectNavigation` extracted as a private hook inside the same file to share navigate + setLastProjectId logic between the combobox and list handlers without prop-drilling.
- `LAST_PROJECT_KEY` is imported from `RootRedirect.tsx` (the single source of truth for that key) rather than redeclared — consistent with the DRY convention.
- When collapsed, the `<aside>` has no width (flex-none with no w-*) so the content outlet fills the full remaining width automatically with no need for explicit width calculations.
- The combobox uses an HTML `<select>` rather than a custom dropdown — consistent with the TopBar app-switcher pattern and keeps the sidebar complexity low for this iteration.

**Code locations**:
- `frontend/src/app/ProjectSidebar.tsx` — new file; full sidebar implementation
- `frontend/src/app/AppShell.tsx` — updated; replaces the `#sidebar-region` placeholder with `<ProjectSidebar />`

**Technical debt noted**:
None.

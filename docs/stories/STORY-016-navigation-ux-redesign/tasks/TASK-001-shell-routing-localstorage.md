---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-001: Shell foundation — routing hierarchy, root redirect, useLocalStorage hook

## What to implement

Establish the layout and routing foundation the rest of the story builds on.

- Restructure the route tree into three nesting levels of layout shells:
  - A flat root layout at `/` that hosts a top-bar region (filled in TASK-002) and an outlet.
  - An AppShell layer (Task Manager mode) that will host the sidebar (TASK-003) and an outlet; all
    project-scoped routes (`/projects/:id/*`) render inside it.
  - A ProjectShell layer (filled in TASK-004) for the per-project sub-nav and a nested outlet.
  - `/projects`, `/sessions`, and `/settings` render inside the flat root layout only — no AppShell
    sidebar chrome and no ProjectShell sub-nav.
  At this task the shells may be thin passthroughs; later tasks fill their chrome. The goal is the
  correct nesting so subsequent tasks slot content in without further route restructuring.
- Implement the `/` redirect: on visiting `/`, redirect to `/projects/:lastId/stories` using the
  last-visited project ID read from browser local storage, or to `/projects` when no project has
  been visited.
- Add a shared, typed, reactive `useLocalStorage` hook that reads/writes a value in browser local
  storage and keeps components in sync with it. This hook backs three consumers across the story:
  sidebar collapsed state, last-visited project ID, and per-story slide-over panel state.

## Scope

Frontend routing composition and shared hooks. No backend, no API contract changes.

## Dependencies

None

## Acceptance Criteria

- [ ] The route tree has three nesting levels: flat root layout → AppShell → ProjectShell, with
      `/projects`, `/sessions`, `/settings` rendering in the flat root layout without sidebar or sub-nav
- [ ] Visiting `/` redirects to `/projects/:lastId/stories` when a last-visited project ID exists in
      local storage, otherwise to `/projects`
- [ ] `useLocalStorage` is available as a shared hook: it persists a typed value, returns the current
      value and a setter, and updates consuming components reactively when the value changes
- [ ] All existing routes still resolve (no regression) after the restructuring

## Intended ADR

Contributes to the planned navigation-model ADR (see implementation_plan.md → Planned ADRs). No ADR
file is created at this stage.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
- Created `useLocalStorage<T>` hook at `src/shared/hooks/useLocalStorage.ts`: typed, reactive wrapper over browser local storage. Reads on mount, writes via a setter that JSON-serialises the value and dispatches a custom `localstorage-update` event so all hook instances in the same tab stay in sync. A `storage` event listener handles cross-tab sync.
- Created `RootLayout` (`src/app/RootLayout.tsx`): flat root shell — renders a `#topbar-region` placeholder div (filled in TASK-002) and an `<Outlet />`.
- Created `AppShell` (`src/app/AppShell.tsx`): Task Manager mode shell — renders a `#sidebar-region` placeholder div (filled in TASK-003) beside a content `<Outlet />` in a flex row.
- Created `ProjectShell` (`src/app/ProjectShell.tsx`): per-project sub-nav shell — renders a `#project-subnav-region` placeholder div (filled in TASK-004) and a nested `<Outlet />`.
- Created `RootRedirect` (`src/app/RootRedirect.tsx`): index route handler — reads `app:last_project_id` from local storage via `useLocalStorage` and navigates to `/projects/:lastId/stories` or `/projects` accordingly. Exports the `LAST_PROJECT_KEY` constant so sidebar/navigation in later tasks write to the same key.
- Rewrote `src/app/router.tsx`: three-level nested route tree (RootLayout → AppShell → ProjectShell). `/projects`, `/sessions`, `/settings` render directly in RootLayout with no project chrome. `/projects/:projectId/*` renders in AppShell → ProjectShell with sub-routes for `stories`, `board`, `milestones`, `settings`. Board and project settings tabs are temporary `<Navigate>` redirects to `../stories` until TASK-007 and TASK-009 implement them.

**Deviations from plan**:
- The old top-level `/` index route previously rendered `ProjectsPage` directly. It now renders `RootRedirect`, and `/projects` is the explicit route for the projects management page. This is consistent with the implementation plan.
- `/projects/:projectId` (old Stories path) is replaced by `/projects/:projectId/stories`. The old path no longer has a route; direct links to it will hit the AppShell index which redirects to `/stories`. This is intentional — TASK-006 will update all internal links.

**Technical decisions made**:
- `LAST_PROJECT_KEY` exported from `RootRedirect.tsx` rather than a separate constants file, since it has exactly one reader (`RootRedirect`) and will have one writer (sidebar in TASK-003). If more consumers appear, extract to `src/config/storageKeys.ts`.
- Board and project-settings tab routes use `<Navigate to="../stories" replace />` as temporary placeholders rather than a `PlaceholderScreen`, to avoid confusing UX before TASK-007 and TASK-009 implement real content. Both carry `// TODO(STORY-016)` comments per convention.
- `useLocalStorage` dispatches a custom `localstorage-update` event on every write so that multiple hook instances in the same tab (e.g. sidebar and redirect both reading `last_project_id`) stay in sync without a shared context. The native `storage` event only fires in other tabs.

**Code locations**:
- `frontend/src/shared/hooks/useLocalStorage.ts` — new hook
- `frontend/src/app/RootLayout.tsx` — new flat root shell
- `frontend/src/app/AppShell.tsx` — new Task Manager mode shell
- `frontend/src/app/ProjectShell.tsx` — new per-project sub-nav shell
- `frontend/src/app/RootRedirect.tsx` — new `/` index redirect + `LAST_PROJECT_KEY` constant
- `frontend/src/app/router.tsx` — fully rewritten with three-level nested routes

**Technical debt noted**:
- `StoriesPage.tsx` breadcrumb still links to `/` (now a redirect). Will be updated in TASK-006 when the Stories list is remounted under the new path.
- The old `Layout.tsx` remains on disk but is no longer referenced by any route. It can be deleted in TASK-002 once the real top bar lands.

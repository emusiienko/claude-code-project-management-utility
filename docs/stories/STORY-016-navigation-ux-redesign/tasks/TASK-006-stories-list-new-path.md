---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-006: Stories list at /projects/:id/stories

## What to implement

Relocate the existing Stories list (from STORY-004, previously at `/projects/:id`) to the `Stories`
sub-nav tab at `/projects/:id/stories`, rendered inside ProjectShell.

- Preserve the existing filter bar, table, and create/edit/delete actions unchanged.
- Make each story title clickable. Clicking a title navigates to the nested slide-over route
  `/projects/:id/stories/:storyId` (the slide-over itself is built in TASK-008); this task wires the
  navigation trigger from the title.
- The Stories list must remain mounted when the slide-over route is active, so the list stays visible
  behind the dimmed slide-over.

## Scope

Frontend Stories list placement and title navigation trigger inside ProjectShell. No backend, no API
contract changes.

## Dependencies

TASK-004

## Acceptance Criteria

- [ ] The Stories list renders at `/projects/:id/stories` under the `Stories` sub-nav tab
- [ ] The existing filter bar, table, and create/edit/delete actions are preserved with no regression
- [ ] Clicking a story title navigates to `/projects/:id/stories/:storyId`
- [ ] The Stories list remains mounted while the `:storyId` child route is active

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
- Verified that `StoriesPage` was already mounted at `/projects/:id/stories` by TASK-001 — no route change needed.
- Removed the old breadcrumb (`Link to="/"` + project name) and `h1` heading from `StoriesPage` — they were left from the pre-shell design where the project name was the page heading; the new shell makes them redundant (sidebar shows active project, sub-nav shows the tab).
- Added a `useEffect` in `StoriesPage` that writes the active `projectId` to `localStorage` under `LAST_PROJECT_KEY` on mount and whenever `projectId` changes, so `RootRedirect` returns to this project on the next visit.
- Added `onTitleClick: (story: Story) => void` prop to `StoryList` — separates the title navigation action from the edit action. Updated `aria-label` on the title button from "Edit story: …" to "Open story: …" to reflect the new intent.
- Added `handleTitleClick` in `StoriesPage` that calls `navigate(`/projects/${safeProjectId}/stories/${story.id}`)`.
- Converted the `stories` route in `router.tsx` from a leaf to a layout route with a child `:storyId` route (`element: null` placeholder) so that navigating to `/projects/:id/stories/:storyId` keeps `StoriesPage` mounted; TASK-008 will replace the placeholder with the slide-over component.
- Added `<Outlet />` to the bottom of `StoriesPage`'s render tree to host the TASK-008 slide-over.

**Deviations from plan**:
- None. The route was already established by TASK-001; this task only wired the navigation trigger, `LAST_PROJECT_KEY` update, and the layout-route structure needed to keep the list mounted.

**Technical decisions made**:
- `useEffect` dependency array intentionally omits `setLastProjectId` (the setter from `useLocalStorage` is stable but not memoized in the hook's current form) — the eslint-disable comment documents this. The effect only needs to re-run when `projectId` changes.
- `element: null` used for the `:storyId` child route placeholder — React Router renders nothing for a null element, so navigating to the route is valid and `StoriesPage` stays mounted via its `<Outlet />`. TASK-008 will replace `null` with the slide-over.

**Code locations**:
- `frontend/src/features/stories/StoriesPage.tsx` — added `useLocalStorage`/`LAST_PROJECT_KEY` import, `useEffect` for last-project persistence, `handleTitleClick`, `<Outlet />`, removed old breadcrumb and `h1` heading; removed unused `useProjectDetail` import
- `frontend/src/features/stories/components/StoryList.tsx` — added `onTitleClick` prop; title button now calls `onTitleClick` instead of `onEdit`; updated `aria-label`
- `frontend/src/app/router.tsx` — `stories` route converted to layout route with `children: [{ path: ":storyId", element: null }]` placeholder

**Technical debt noted**:
- None.

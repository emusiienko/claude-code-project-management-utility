---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-005: /projects full-page management

## What to implement

Move the projects management view to a full-screen page at `/projects`, rendered in the flat root
layout with no sidebar and no sub-nav.

- Preserve the existing project management functionality: a table listing all projects with
  create/edit/delete actions, unchanged from current behaviour.
- The page is reached via the sidebar's `⚙ Gestisci progetti` link and via the `/` redirect fallback
  when no project has been visited.
- Empty state: when no projects exist, show an empty state with a prominent "Create your first
  project" call-to-action.

## Scope

Frontend projects management page placement and empty state. No backend, no API contract changes.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] `/projects` renders full-screen with no sidebar and no sub-nav
- [ ] The projects table lists all projects and supports create, edit, and delete (existing behaviour
      preserved)
- [ ] With no projects, the page shows an empty state with a prominent "Create your first project"
      call-to-action
- [ ] `/projects` is reachable via the sidebar `⚙ Gestisci progetti` link

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
The `/projects` route was already registered in `RootLayout` (outside `AppShell`/`ProjectShell`) as established in TASK-001 — so no sidebar and no sub-nav chrome is rendered there by design. This task focused on two changes:

1. `ProjectsPage.tsx` — wrapped the root `<div>` with full-page layout classes (`mx-auto w-full max-w-5xl px-6 py-8`) so the content is properly spaced in the wider viewport without a sidebar. Also added `focus-visible` ring to the "New project" button for consistency.

2. `ProjectList.tsx` — extended the empty state with a prominent "Create your first project" `<button>` CTA. An optional `onCreateFirst?: () => void` prop was added to the `ProjectListProps` interface; the button is rendered only when the callback is provided. The `ProjectsPage` passes `openCreate` as `onCreateFirst`. The empty state container also gained vertical padding (`py-20`) so the CTA sits prominently in the centred area.

**Deviations from plan**: None. The route registration itself was already complete from TASK-001; this task only needed the layout polish and empty-state CTA.

**Technical decisions made**:
- `onCreateFirst` is optional (`?`) on `ProjectList` rather than required — other callers (e.g. a sidebar mini-widget, if ever needed) can omit it and the list still renders the minimal "No projects yet" copy without the CTA button.
- The CTA button uses the same `bg-brand-600` style as the "New project" heading button so both entry points for project creation are visually consistent.

**Code locations**:
- `frontend/src/features/projects/ProjectsPage.tsx` — full-page layout wrapper + `onCreateFirst` prop forwarding
- `frontend/src/features/projects/components/ProjectList.tsx` — `onCreateFirst` optional prop + prominent empty-state CTA

**Technical debt noted**: None.

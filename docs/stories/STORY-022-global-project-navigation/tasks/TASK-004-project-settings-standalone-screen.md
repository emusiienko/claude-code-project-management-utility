---
status: ToDo
assignee: frontend-developer
story: STORY-022
---

# TASK-004: Promote Project Settings to a standalone screen

## What to implement
Make the project's Settings view a standalone screen instead of the fourth tab in
the per-project sub-navigation. The destination URL introduced by TASK-003
(`/projects/:id/settings`) stays the same — only where and how it renders changes.

Model the standalone screen on the existing Milestone Detail screen
(`/milestones/:id`): a top-level view outside the Task Manager sidebar shell and
outside the per-project sub-navigation shell, with its own heading and a back-link.

- **Reduce the per-project sub-navigation to three tabs** — Stories, Board,
  Milestones. Settings leaves the tab set.
- **Relocate the `/projects/:id/settings` route** so the Project Settings page
  renders as its own full screen, not as tab content inside the sub-navigation
  shell. Landing on it must not show the per-project tab bar or the Task Manager
  sidebar.
- **Give the Project Settings page standalone-screen chrome**: a heading that
  identifies the project by name and a back-link that returns to the Projects
  Management page (`/projects`). Add the not-found / load-error handling for an
  unresolved project id that the sub-navigation shell provided while Settings was
  a tab — reuse the same project-existence check that shell uses. The existing
  dictionary-override editor content is unchanged.
- **Leave the bare-project-URL redirect and the sidebar behavior untouched**: a
  bare `/projects/:id` still lands on Stories, and the Task Manager sidebar's
  project selection still lands on Stories, so Stories/Board/Milestones stay
  reachable via the sub-navigation once inside a project.
- **Preserve the top-bar Projects entry's exact-match active state** (BUG-001): a
  `/projects/:id/settings` URL, still under the `/projects` prefix, must keep the
  top-bar Projects entry inactive.

## Scope
Frontend only — the route table, the per-project sub-navigation shell, and the
Project Settings page (`frontend/src/app/` and
`frontend/src/features/settings/`). No backend, no API contract, no data model,
and no change to the Task Manager sidebar or the bare-project-URL redirect.

## Dependencies
TASK-003 (Done) — refines the destination it introduced.

## Acceptance Criteria
- [ ] The per-project sub-navigation shows exactly Stories, Board, and Milestones;
      Settings is not among the tabs
- [ ] Navigating to `/projects/:id/settings` shows the Project Settings screen with
      no per-project tab bar and no Task Manager sidebar
- [ ] The Project Settings screen shows a heading identifying the project and a
      back-link that returns to `/projects`
- [ ] An unresolved project id on `/projects/:id/settings` yields a not-found state
      (equivalent to the pre-existing project-not-found handling)
- [ ] Clicking a project name on `/projects` lands on this standalone Project
      Settings screen
- [ ] A bare `/projects/:id` still redirects to Stories, and the Task Manager
      sidebar's project selection still lands on Stories
- [ ] The top-bar Projects entry is not marked current on `/projects/:id/settings`
- [ ] The dictionary-override editor (values, override badges, inherited defaults)
      behaves as before

## Intended ADR
None. Spec-mandated navigation restructuring following the established standalone
Milestone Detail screen pattern — no ecosystem choice, no hard-to-reverse trade-off.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

---
status: Done
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
**Date**: 2026-07-21

**What was done**:
- Relocated `/projects/:projectId/settings` out of the `ProjectShell` sub-navigation tree in `router.tsx` and added it as a top-level sibling route of the `AppShell`/`ProjectShell` branch (alongside `milestones/:id`, `comments/:id`), so the URL now renders with no Task Manager sidebar and no per-project tab bar.
- Removed the `Settings` tab from `ProjectShell`'s `SUB_NAV_TABS`, leaving exactly three tabs: Stories, Board, Milestones.
- Extracted `ProjectShell`'s inline `ProjectNotFound` and `ProjectLoadError` components (previously private to that file) into `shared/components/ProjectNotFound.tsx` and `shared/components/ProjectLoadError.tsx` so both `ProjectShell` and the now-standalone `ProjectSettingsPage` can reuse identical not-found/load-error UI without duplication.
- Rewrote `ProjectSettingsPage.tsx` to perform its own project resolution via `useProjectDetail` (the same hook `ProjectShell` already used) — since it no longer renders inside `ProjectShell`, it needed its own loading/not-found/error handling. Added standalone-screen chrome: an `<h1>` showing the project's name and a back-link (`ArrowLeft` icon, same visual pattern as `MilestoneDetailPage`'s back-link) returning to `/projects`. The dictionary-override editor (`EffectiveSettingsPanel`) is passed through unchanged.
- Updated the route-table doc-comment at the top of `router.tsx` to reflect the new tree shape.

**Deviations from plan**: None. Implemented exactly as scoped in the task and the architect's implementation plan — same destination URL, new rendering context, modeled on the Milestone Detail screen pattern.

**Technical decisions made**:
- Extracted the not-found/load-error UI to `shared/components/` rather than duplicating it inline in `ProjectSettingsPage`, per the project's DRY convention (shared UI primitives belong in shared modules, not copied across feature folders). Both `ProjectShell` and `ProjectSettingsPage` now import the same two components.
- Relied on React Router's branch-matching behavior rather than route ordering to resolve the URL ambiguity risk: since `settings` is no longer a child of `ProjectShell`, the `AppShell` branch simply cannot produce a matching branch for `/projects/:id/settings`, so the new top-level sibling route is the only branch that matches — no explicit route priority needed.
- Kept `ProjectSettingsPage`'s own heading as a two-level heading (`<h1>` project name, `<h2>` "Project Settings") rather than merging them, so the project identity and the screen's purpose are both visible and distinguishable, consistent with how `MilestoneDetailPage` treats its own name + status badge as the primary heading.

**Code locations**:
- `frontend/src/app/router.tsx` — route relocation + updated doc-comment tree
- `frontend/src/app/ProjectShell.tsx` — three-tab sub-nav; imports shared not-found/load-error components
- `frontend/src/features/settings/ProjectSettingsPage.tsx` — rewritten as a standalone screen
- `frontend/src/shared/components/ProjectNotFound.tsx` — new, extracted
- `frontend/src/shared/components/ProjectLoadError.tsx` — new, extracted

**Technical debt noted**:
- **Expected, pre-flagged test breakage (owned by qa-automation TASK-005, which depends on this task):** `frontend/src/app/ProjectShell.test.tsx` ("renders all four sub-nav tabs...") and `frontend/src/features/settings/ProjectSettingsPage.test.tsx` (all four tests — the page now fetches via `useProjectDetail`/TanStack Query and the existing test harness renders it without a `QueryClientProvider`, and the page's own heading assertions no longer match the old tab-content copy) now fail. Per `docs/qa-automation-strategy.md`'s Bug Assignment Policy, a stale test expectation/harness is qa-automation's own responsibility, not frontend-developer's — and TASK-005 was explicitly planned to extend/regression-guard this exact screen right after this task. Baseline run before this task: 20 files / 213 tests, all passing. Post-implementation run: 18 files passed, 2 failed (5 individual test failures, both pre-identified above) — no other test file regressed. `tsc --noEmit` and `npm run build` both succeed with no errors.
- Several docs describing the four-tab sub-nav (`docs/architecture.md`, `docs/requirements/requirements_web.md`, `docs/qa/test-cases.md` + `TC-025`, `docs/tech_decisions/ADR-014`) still describe the pre-TASK-004 shape. These are owned by architect/manual-qa/spec-writer respectively and are expected to be brought current at Reconcile — not touched here.

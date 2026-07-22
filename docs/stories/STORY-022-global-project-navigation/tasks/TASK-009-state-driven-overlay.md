---
status: Done
assignee: frontend-developer
story: STORY-022
---

# TASK-009: State-driven slide-over overlay for Projects and Config

## What to implement
Replace the closable-view routing of Revisions 1 and 2 with a state-driven
slide-over overlay so that Projects and Config cover the active main view
without ever unmounting it. This is a frontend navigation-shell change; see
implementation_plan.md § Revision 3 for the full reasoning.

- Introduce an always-mounted overlay host in the root shell, layered over the
  main-view outlet. It owns the overlay stack state: nothing open, the Projects
  stack, or the Config stack. The Projects stack has two levels — the project
  list (root) and a single project's Settings (pushed when a project is
  chosen). The Config stack has one level — the system dictionary editor.
- Turn the top-bar Projects and Config entries into triggers that open their
  respective overlays and show an open/active indication driven by overlay
  state (not by route matching). Keep the existing top-bar focus treatment.
- Provide two distinct controls on the panel, matching the Story slide-over:
  **Back** pops one internal level of the current stack and appears only when
  there is depth beyond the root; **Dismiss** (an icon control) clears the
  whole stack and reveals the main view underneath. Register the overlay with
  the shared modal-escape stack so Escape closes one level at a time and
  composes correctly when the overlay covers an open Story slide-over or Task
  Detail modal.
- Reuse the Story slide-over panel chrome: right-side panel, dimmed backdrop
  starting below the top bar so the top bar stays clickable and unclipped, the
  slide-in animation, and z-indexing below the top bar.
- Render the existing content as panel bodies: the project list as the Projects
  root level; the project-settings dictionary editor as the Projects second
  level; the system dictionary editor as the Config level. In the project list,
  choosing a project pushes the settings level (Back returns to the list) — no
  route navigation. Preserve the existing project-existence / not-found handling
  for an unresolved project id inside the settings panel.
- Remove the `/projects`, `/settings`, and `/projects/:projectId/settings`
  route entries; their content now renders only inside overlay panels. Each of
  the three content components must have exactly one rendering context after
  this change — strip the full-page chrome they carried for the old routes (the
  "Close" controls, the standalone Project Settings heading/back-link, and the
  "View Stories" patch), since the overlay frame now owns Back/Dismiss.
- Simplify the app-switcher to derive its mode from the current route only, and
  retire the Revision-2 navigation apparatus entirely: the main-view/closable-
  view classification, the last-main-view recording hook, the close-to-last-
  main-view affordances, and the underlying-main derivation. Delete the
  now-unused modules rather than leaving them dead.
- Rework the root cold-start: an empty install (no projects) lands on an empty
  Task Manager main view with the Projects overlay opened automatically so the
  first project can be created; a last-visited or first project still resolves
  to that project's Stories. The Task Manager sidebar's project selection and
  the bare-`/projects/:id` redirect to Stories are unchanged.

## Scope
Frontend navigation shell: the root layout / top bar region, the app router
table, the root redirect, the app-switcher, and the Projects/Config/Project-
Settings content components reused as panel bodies. No backend, API contract, or
data-model change.

## Dependencies
None (supersedes behavior from TASK-001, TASK-003, TASK-004, TASK-006, TASK-007).

## Acceptance Criteria
- [x] The Projects and Config top-bar entries open right-side slide-over panels
      over the current main view; the main-view URL does not change when a panel
      opens or closes.
- [x] Each top-bar entry shows an open/active indication while its overlay is open.
- [x] Opening a panel from Task Manager or from Sessions keeps the app-switcher
      on the mode the current route belongs to.
- [x] The Projects overlay shows the project list; choosing a project shows that
      project's Settings editor with a Back control returning to the list.
- [x] Back appears only when the stack has depth beyond its root; Dismiss clears
      the whole stack from any level and reveals the unchanged main view.
- [x] Escape closes the topmost overlay level and composes with a Story slide-
      over / Task Detail modal beneath it (one close per press).
- [x] `/projects`, `/settings`, and `/projects/:id/settings` are no longer routes;
      the Revision-2 navigation modules are removed and nothing imports them.
- [x] The app-switcher derives its mode from the current route only.
- [x] Cold start with no projects lands on an empty Task Manager main view with
      the Projects overlay open; with a project available it lands on that
      project's Stories. The sidebar selection and bare-`/projects/:id` redirect
      to Stories still work.
- [x] An unresolved project id in the settings panel yields the existing
      not-found state.

## Intended ADR
None — reuses the app's established slide-over and modal-escape conventions;
self-contained and reversible frontend navigation change.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-22

**What was done**:
Replaced the Revision-2 closable-view routing with a state-driven slide-over overlay.

- Added `useOverlayStack` (new hook) owning the overlay stack: `{ kind: "none" }`, `{ kind: "projects", stack: ProjectsOverlayLevel[] }` (list → a project's Settings), or `{ kind: "config" }`. Exposes `openProjects`, `openConfig`, `openProjectSettings`, `back`, `dismiss`, plus a `hasOverlayDepth()` helper for the Back-visibility rule.
- `RootLayout` now instantiates `useOverlayStack()` once and threads it three ways: as a prop to `TopBar`, as a prop to the new `OverlayHost`, and via `<Outlet context={overlay}>` so routed children (`RootRedirect`) can reach it through `useOutletContext<OverlayControls>()`.
- Added `OverlayHost` (new component in `src/app/`): the always-mounted panel, reusing `StorySlideOver`'s chrome conventions (right-side panel, dimmed backdrop starting at `top-12`, `animate-slide-in-from-right`, z-40/z-50 below the top bar's z-110). Renders Back (only when `hasOverlayDepth`) and Dismiss controls, registers with the shared `useModalEscape` stack (Escape pops one level if depth exists, else dismisses — "one level per press"), and switches body content by stack level: `ProjectsPanelBody` (list), `ProjectSettingsPanelBody` (settings), or `SystemSettings` (config).
- `TopBar` rewritten: the Projects/Config entries are now plain `<button>` triggers (`aria-current="page"` driven by `overlay.state.kind`, not `NavLink`s), and the app-switcher's mode is derived purely from `location.pathname` — no more closable-view special-casing. Switching to Task Manager now simply navigates to `/` (letting `RootRedirect` resolve to the last/first project, or the empty state), rather than to a remembered exact sub-view URL.
- `router.tsx`: removed the `/projects`, `/settings`, and `/projects/:projectId/settings` route entries and their lazy imports.
- `RootRedirect`: when no projects exist at all, it now stays at `/` (rendering a small "No projects yet" empty-state main view) and calls `openProjects()` once (via `useOutletContext`, guarded by a ref so it only auto-opens once per mount) instead of navigating to the now-nonexistent `/projects`.
- New `ProjectsPanelBody` (`features/projects/components/`): the former `ProjectsPage`'s list + create/edit/delete orchestration, minus the page heading and "Close" control (the overlay frame owns those now). `ProjectList` no longer renders the project-name cell as a route `Link` — it's a `<button onClick={() => onSelectProject(project.id)}>` that pushes the overlay's Settings level.
- New `ProjectSettingsPanelBody` (`features/settings/components/`): the former standalone `ProjectSettingsPage`'s project-existence check (`useProjectDetail` → `ProjectNotFound`/`ProjectLoadError`) plus `EffectiveSettingsPanel`, minus the project-named `<h1>`/back-link/"View Stories" bridge (superseded by TASK-010).
- Deleted the now-fully-superseded Revision-2 modules and their routed-page counterparts: `ProjectsPage.tsx`, `SettingsPage.tsx`, `ProjectSettingsPage.tsx`, `navigationModel.ts`, `useLastMainViewUrl.ts`, `useLastVisitedUrl.ts` (plus their test files where the corresponding production module was deleted outright — see Deviations).
- Fixed `ProjectNotFound`'s hardcoded `Link to="/projects"` (now a 404 target) to `Link to="/"`, since Projects has no route to link to any more; `/` always resolves via `RootRedirect`.
- Updated `CLAUDE.md` Code Map entries for `app/`, the deleted navigation modules (removed), `ProjectNotFound`/`ProjectLoadError`, `features/projects/`, and `features/settings/`.

**Deviations from plan**:
- The plan didn't explicitly call for retiring `useLastVisitedUrl.ts`/the `LAST_TASK_MANAGER_URL_KEY` mode-switch memory (only `useLastMainViewUrl`, the last-*main-view* recording hook, was named). Simplifying `TopBar`'s mode-switch to always `navigate("/")` made `useLastVisitedUrl.ts` fully unused, so I deleted it too rather than leave a dead generic hook with a single now-pointless caller. Net effect: switching from Sessions to Task Manager now lands on the last-visited *project's Stories* (via the pre-existing `LAST_PROJECT_KEY`/`RootRedirect` mechanism) rather than the exact last Task-Manager sub-view URL (e.g. a specific project's Board tab). This is a minor UX narrowing, consistent with the task's "simplify the app-switcher to derive its mode from the current route only" instruction, but is a judgment call worth flagging.
- Deleted four test files outright rather than leaving them broken: `ProjectsPage.test.tsx`, `SettingsPage.test.tsx`, `ProjectSettingsPage.test.tsx`, `navigationModel.test.ts` — each tested a production module this task deletes entirely, so the alternative was an unresolvable import left permanently in the tree. `TopBar.test.tsx` and `ProjectList.test.tsx` (which test components that still exist, only with changed behavior/props) were left untouched per test-file ownership (qa-automation writes/owns these); they now fail to compile/pass and are flagged below for TASK-011.
- Cold-start "empty Task Manager main view" is rendered inline by `RootRedirect` at `/` (a centered "No projects yet" message) rather than a new dedicated route/screen — the plan didn't specify a concrete shape for this view, and no route exists to redirect to any more, so resolving it directly in `RootRedirect` (the component already responsible for this decision tree) was the smallest-surface-area option.

**Technical decisions made**:
- Overlay state lives in `RootLayout` (one level above both consumers — `TopBar` and `OverlayHost`) and is passed as a prop, per the project's "no global client state store" convention; `<Outlet context>` (a React Router idiom, not a new ad-hoc context) is used only for the one case where a routed descendant (`RootRedirect`) needs it, which plain props can't reach across the router boundary.
- Escape's behavior ("one level per press") is implemented as: pop one level if the stack has depth, else dismiss entirely — mirroring the Back/Dismiss split rather than always fully dismissing.
- Panel width is `w-[640px] max-w-[90vw]` (narrower than the Story slide-over's `w-[90vw]`) since Projects/Config content is a list/form, not a kanban board — the plan asked to reuse the slide-over's chrome (backdrop, animation, z-index), not necessarily its width.
- `ProjectsPanelBody` and `ProjectSettingsPanelBody` are new files rather than trimmed-down copies of the deleted page components kept under their old names, to keep "one component per file" scoped to what each now does (panel body, not routed page).

**Code locations**:
- `frontend/src/shared/hooks/useOverlayStack.ts` (new)
- `frontend/src/app/OverlayHost.tsx` (new)
- `frontend/src/app/RootLayout.tsx`, `frontend/src/app/TopBar.tsx`, `frontend/src/app/RootRedirect.tsx`, `frontend/src/app/router.tsx` (modified)
- `frontend/src/features/projects/components/ProjectsPanelBody.tsx` (new), `frontend/src/features/projects/components/ProjectList.tsx` (modified — `onSelectProject` replaces the route `Link`)
- `frontend/src/features/settings/components/ProjectSettingsPanelBody.tsx` (new)
- `frontend/src/shared/components/ProjectNotFound.tsx`, `frontend/src/shared/components/ProjectLoadError.tsx` (modified)
- Deleted: `frontend/src/features/projects/ProjectsPage.tsx` (+`.test.tsx`), `frontend/src/features/settings/SettingsPage.tsx` (+`.test.tsx`), `frontend/src/features/settings/ProjectSettingsPage.tsx` (+`.test.tsx`), `frontend/src/shared/utils/navigationModel.ts` (+`.test.ts`), `frontend/src/shared/hooks/useLastMainViewUrl.ts`, `frontend/src/shared/hooks/useLastVisitedUrl.ts`

**Technical debt noted**:
- **Test realignment deferred to TASK-011 (qa-automation), by design.** Baseline (before this task): 22 test files / 260 tests, all passing. After this task: 18 test files / 188 tests — 14 files / 182 tests passing, 4 files / 6 tests failing:
  - `src/app/TopBar.test.tsx` — fails to compile (`Cannot find module '@/shared/hooks/useLastMainViewUrl'`; missing required `overlay` prop). Entirely superseded — TopBar's triggers, active-state mechanism, and mode-switch logic all changed. Needs a full rewrite in TASK-011 (this is exactly the "re-align the superseded test expectations from TASK-002/TASK-005/TASK-008" item called out in the implementation plan's TASK-011 description).
  - `src/features/projects/components/ProjectList.test.tsx` — 1 failing test ("links the project name to its Settings view") plus 8 compile errors (missing required `onSelectProject` prop) across the other tests in the file. The name cell is a `<button onClick>` now, not a `Link`.
  - `src/app/RootRedirect.test.tsx` — 4 failing tests (all three "no projects" scenarios + the "projects exist" scenario) — `TypeError: Cannot destructure property 'openProjects' of 'useOutletContext(...)' as it is null`, because the test renders `<RootRedirect>` directly via `<Route path="/" element={<RootRedirect />} />` rather than under an `<Outlet context={overlay}>`-providing parent. Production code is correct (verified this is a test-harness gap, not a runtime bug, by tracing the thrown TypeError to the missing context provider) — the fix is for the test harness to wrap `RootRedirect` in a route tree that supplies an outlet context.
  - `src/app/ProjectShell.test.tsx` — 1 failing test ("includes a Back to Projects link in the not-found state") — asserts `href="/projects"`; `ProjectNotFound` now links to `/`.
  - This means `npm run build` (which runs `tsc --noEmit` over all of `src`, tests included) will fail until TASK-011 lands — verified separately that production code alone type-checks clean (`tsc --noEmit` output filtered to non-test files is empty) and that `vite build` (bundling only, no type-check) succeeds. TASK-011 depends on this task and TASK-010 and is explicitly scoped to this realignment; per document ownership, test files are qa-automation's to rewrite, so they were left as-is (except four files whose corresponding production module no longer exists — see Deviations) rather than modified here.
  - Pre-existing, unrelated to this task: `ProjectSettings.tsx`'s `ProjectSettings` export (the two-panel project-selector variant) is unused dead code predating this story — noted in the Code Map, not touched.

---
id: BUG-006
story: STORY-022
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-006: No in-app path from a project's Settings screen back to its own Stories/Board/Milestones for a project not yet opened in Task Manager mode

## Description
`description.md`'s acceptance criteria state: "Once inside a project via this
entry point, the Stories, Board, and Milestones views remain fully reachable
through the existing project sub-navigation tabs — no functionality is
removed, only the landing destination from the Projects Management page
changes."

In practice, the standalone Project Settings screen
(`/projects/:id/settings`, TASK-004) intentionally renders with no
per-project sub-navigation tab bar and no Task Manager sidebar — confirmed by
its own test suite (`ProjectSettingsPage.test.tsx`: "does not render a
per-project sub-nav tab bar (standalone screen, not a tab)"). Its only
navigation control is a "Back to Projects" link that returns to the flat
`/projects` list — not into the project.

The Projects Management page's project row also offers no other entry point
into the project: the name links only to Settings, and Edit/Delete are the
only other row actions.

The result: for any project the user has not already opened in Task Manager
mode during the current browser session (nothing recorded under
`app:last_task_manager_url`/`app:last_project_id`), clicking that project's
name on `/projects` lands on its Settings screen with **no clickable, in-app
way to reach that same project's Stories, Board, or Milestones** — not from
the Settings screen itself, and not from "Back to Projects" either. The only
way to reach the sub-navigation tabs described in the AC is to already know
to switch to Task Manager mode via the app-switcher (which lands on whatever
project was last visited, or the first project in the list — not
necessarily this one) and then re-select this project from the sidebar's
combobox or list — a workaround that requires the user to already understand
this indirection, and does not use "the existing project sub-navigation
tabs" from the entry point the AC describes.

## Steps to Reproduce
1. Clear browser storage (or use a fresh session) so no project has yet been
   opened in Task Manager mode.
2. Navigate to `/projects` (e.g. via the global "Projects" top-bar entry).
3. Click the name of a project you have not yet opened in Task Manager mode
   this session (e.g. "This Is A Very Long Project Name That Tests Layout
   Overflow Behavior In The Table Row", id
   `0e941dad-66e9-4c1a-84cf-f488323914ad`).
4. Observe: you land on `/projects/0e941dad-66e9-4c1a-84cf-f488323914ad/settings`.
   The only navigation control on the page is "Back to Projects".
5. Look for any way to reach this same project's Stories, Board, or
   Milestones view: there is none on this screen.
6. Click "Back to Projects" — you are returned to the flat `/projects` list,
   which also has no Stories/Board/Milestones link for this project.
7. The only remaining path is to switch the app-switcher to "Task Manager"
   (which navigates to a *different*, previously-visited project's Stories,
   or the first project in the list if none was ever visited) and then
   manually re-select this project from the sidebar.

## Expected Result
Per the story's explicit acceptance criterion, after landing on a project's
Settings screen via the Projects Management page's project-name click, the
Stories, Board, and Milestones views for that same project should remain
"fully reachable through the existing project sub-navigation tabs" — i.e.
some in-app control from this entry point should lead to that project's own
Task Manager view.

## Actual Result
No such control exists. The standalone Settings screen only offers "Back to
Projects" (to the flat list, not into the project), and the Projects
Management page's row offers no Stories/Board/Milestones link either. A
first-time visit to a project via this entry point is a dead end for reaching
that project's Stories/Board/Milestones without manually editing the URL or
first navigating elsewhere in Task Manager mode and re-selecting the project
from the sidebar.

## Additional Info
- This is a consequence of TASK-004's deliberate design (standalone screen
  modeled on Milestone Detail, no sub-nav tab bar — verified intentional via
  its own test file, not a coding error) rather than a regression introduced
  by TASK-006/007/008. It surfaced during this manual-qa re-verification pass
  because tc-009 (`docs/stories/STORY-022-global-project-navigation/test-cases/tc-009-project-name-click-lands-on-settings.md`)
  steps 5–8 require using "the project's sub-navigation tabs" directly from
  the Settings landing screen, which do not exist there.
- `RootRedirect` (`frontend/src/app/RootRedirect.tsx`) and the "switch to Task
  Manager" app-switcher action both resolve to `app:last_project_id` /
  `app:last_task_manager_url` — neither is written by visiting
  `/projects/:id/settings`, so neither can serve as a substitute path back to
  *this* project.
- Severity judgment call: classified `major` because it defeats an explicit,
  literal acceptance criterion in the primary flow this story exists to
  support (reaching a project via the global entry point), for any project a
  user has not already browsed this session — a very commonly-reached state
  (e.g. the very first project a new user clicks). A workaround exists
  (switch to Task Manager, then reselect the project from the sidebar), so
  re-triage to `minor` if the team judges the workaround sufficient given the
  Milestone Detail precedent.

## Fix

Added a forward link on the standalone `ProjectSettingsPage.tsx`, next to the
project-name heading, labeled "View Stories" (with an `ArrowRight` icon) that
navigates to `/projects/:id/stories` for the same project — the id already
resolved via `useProjectDetail`. Landing on Stories renders inside
`ProjectShell`, whose three-tab sub-nav (Stories, Board, Milestones) is then
visible and fully usable, satisfying the story's "remain fully reachable
through the existing project sub-navigation tabs" AC without reintroducing a
tab bar or any other chrome on the Settings screen itself (which TASK-004
deliberately removed). Placed as a simple `Link`, not `navigate(-1)`, because
unlike BUG-005's "Back" case this is a fixed forward destination (this
project's own Stories view) rather than an arbitrary previous-view return.

Deliberately labeled "View Stories" rather than bare "Stories" so the
pre-existing `ProjectSettingsPage.test.tsx` assertion "does not render a
per-project sub-nav tab bar" (which checks there is no link with the exact
accessible name "Stories") continues to correctly express its original
intent — no tab bar was added, only a single named forward link with a
different, more descriptive label.

**Code locations**: `frontend/src/features/settings/ProjectSettingsPage.tsx`

**Verification**: baseline `npx vitest run` — 22 test files / 260 tests, all
passing. Post-fix `npx vitest run` — 22 test files / 260 tests, all still
passing (no regressions; the existing "no Stories-named link" assertion still
holds since the new link's accessible name is "View Stories", not "Stories").
`npm run build` (`tsc --noEmit` + `vite build`) succeeds with no errors.

## Re-verification (qa-automation, TASK-011, 2026-07-22)

The fix above (`ProjectSettingsPage.tsx`'s "View Stories" link) was itself
superseded by TASK-009's state-driven overlay model, which removed the
standalone `/projects/:id/settings` route and `ProjectSettingsPage.tsx`
entirely. TASK-010 re-implemented the same resolution against the new
overlay shell: `ProjectSettingsPanelBody` (the Projects overlay's Settings
level) now carries an "Open in Task Manager" action that navigates to
`/projects/:id/stories` and dismisses the overlay in the same action —
landing on `ProjectShell`'s three-tab sub-nav (Stories/Board/Milestones),
exactly satisfying the original acceptance criterion.

Verified via `frontend/src/features/settings/components/ProjectSettingsPanelBody.test.tsx`
(new, TASK-011): clicking "Open in Task Manager" navigates to the project's
Stories and dismisses the overlay in one action, confirmed for a project id
with no prior recorded session state (the exact BUG-006 scenario) as well as
a normal case; also confirmed no sub-navigation tab bar is added to the
Settings panel itself. All 8 tests in that file pass; full suite (22 files /
252 tests) passes; `npm run build` succeeds. Status moved to `resolved`.

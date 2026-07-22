---
status: Done
assignee: frontend-developer
story: STORY-022
---

# TASK-010: Forward bridge from the Projects overlay into a project's Task Manager view

## What to implement
Add an explicit forward action to the Projects overlay that carries the user
from a project's configuration surface into that project's work surface. Labeled
"Open in Task Manager" (leading to the project's Stories), it:

- navigates the underlying main view to the chosen project's Stories, and
- dismisses the overlay in the same action, revealing that project's Stories
  with the three-tab sub-navigation (Stories / Board / Milestones) available as
  it already is.

Place the action where the user is deciding to enter a project — on the
project's Settings panel (the second Projects overlay level) and/or the project
row in the list. This is the coherent successor to the superseded standalone-
screen "View Stories" patch: it is a real main-view navigation, not a
return-to-history guess, and it does not reintroduce a sub-navigation tab bar
onto the settings panel.

This resolves BUG-006 by design: with the state-driven overlay a live main view
is always behind the panel, and this action provides the single in-app path from
the Projects entry point into a project's own Stories/Board/Milestones.

## Scope
Frontend: the Projects overlay content (settings panel and/or project-list row).
No backend, API contract, or data-model change.

## Dependencies
TASK-009 (the overlay host, stack, and Dismiss mechanism must exist first).

## Acceptance Criteria
- [x] From the Projects overlay, a clearly labeled "Open in Task Manager" action
      navigates the main view to the chosen project's Stories.
- [x] Triggering the action dismisses the overlay in the same step; the revealed
      main view is that project's Stories with its sub-navigation tabs present.
- [x] The action works for a project the user has not opened in Task Manager
      this session (the BUG-006 scenario) — no dependence on any previously
      recorded project or URL.
- [x] No sub-navigation tab bar is added to the settings panel itself.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-22

**What was done**:
Added the "Open in Task Manager" forward bridge on the Projects overlay's
Settings level (`ProjectSettingsPanelBody`), next to the project-name
heading, resolving BUG-006 for the state-driven overlay model TASK-009 built.

- `ProjectSettingsPanelBody` now takes an `onDismissOverlay: () => void` prop
  and calls `useNavigate()` itself. Clicking "Open in Task Manager" navigates
  to `/projects/:projectId/stories` and calls `onDismissOverlay()` in the same
  handler — a single click both redirects the main view and clears the
  overlay stack, landing on the project's Stories with the three-tab
  sub-navigation (Stories / Board / Milestones) already available via the
  existing `ProjectShell`.
- `OverlayHost` passes its own `dismiss` control down as `onDismissOverlay`
  when rendering the Settings level, so the panel body doesn't need direct
  access to the overlay stack hook — it only receives the one control it
  needs, consistent with the existing `onSelectProject` callback pattern used
  by `ProjectsPanelBody`/`ProjectList`.
- No route, URL, or overlay-stack shape changed — this is additive UI inside
  a panel body that TASK-009 already built and wired into the stack render.
- No sub-navigation tab bar was added to the settings panel; the action is a
  single labeled button, matching the "single forward action, not a tab bar"
  constraint from implementation_plan.md Revision 3.
- `LAST_PROJECT_KEY` (the last-visited-project record `RootRedirect`/the
  sidebar read) is not written here directly — it is already written by
  `StoriesPage` on mount (pre-existing behavior), so navigating there via this
  bridge keeps that record consistent with every other way of reaching
  Stories, with no extra code needed.

**Deviations from plan**: None. The action was placed on the Settings panel
(the "project's configuration surface" the task calls out), not the
project-list row, since the task's rationale for BUG-006 is specifically
about the Settings level having no path to Stories/Board/Milestones — the
list level already has that path (choosing a project just goes deeper into
that same project, never a dead end).

**Technical decisions made**:
- Kept `useNavigate` inside `ProjectSettingsPanelBody` (a feature component
  under `features/settings/components/`, not `shared/`) rather than lifting
  navigation up into `OverlayHost` — consistent with the frontend
  conventions' "no `useNavigate`/`useLocation` inside **shared** components"
  rule (this component isn't shared) and with existing precedent
  (`StoryLinksSection`, `TaskDetailModal`, `BoardPage` all call `useNavigate`
  at the feature-component level).
- `OverlayHost` only forwards `dismiss`, not the whole `OverlayControls`
  object, to `ProjectSettingsPanelBody` — narrowest-prop-surface, matching how
  `openProjectSettings` alone (not the full overlay object) is passed to
  `ProjectsPanelBody`/`ProjectList` as `onSelectProject`.
- Button styled as a bordered text button (not the shared `IconButton`
  primitive), per the conventions' icon-buttons-vs-text-buttons split: this is
  a primary forward CTA with a visible label ("Open in Task Manager"), not a
  row-level icon-only management action, so it stays outside the
  icon-button mandate — the trailing `ArrowRight` icon is decorative
  (`aria-hidden`), the accessible name comes from the button's own text.

**Code locations**:
- `frontend/src/features/settings/components/ProjectSettingsPanelBody.tsx` (modified — `onDismissOverlay` prop, `useNavigate`, "Open in Task Manager" button)
- `frontend/src/app/OverlayHost.tsx` (modified — passes `onDismissOverlay={dismiss}` to `ProjectSettingsPanelBody`)

**Technical debt noted**:
- None new. Test realignment for the whole state-driven overlay model
  (including this bridge) remains scoped to TASK-011 (qa-automation) as
  already flagged in TASK-009's report — baseline before this task: 18 test
  files / 188 tests, 14 files / 182 tests passing, 4 files / 6 tests failing
  (all pre-existing, documented in TASK-009). After this task: identical
  counts — `npx vitest run` still reports 4 failed test files / 6 failed
  tests, 14 passed / 182 passed — no regressions introduced. `npx tsc --noEmit`
  filtered to non-test files is clean (matches TASK-009's verification
  approach, since the pre-existing test-file failures make the unfiltered
  `npm run build` fail until TASK-011 lands). `npx vite build` (bundling only)
  succeeds with no errors.

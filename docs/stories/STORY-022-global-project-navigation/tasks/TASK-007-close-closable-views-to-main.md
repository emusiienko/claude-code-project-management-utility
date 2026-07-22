---
status: Done
assignee: frontend-developer
story: STORY-022
---

# TASK-007: Close closable views to the last main view

> **Superseded by Revision 3 (TASK-009, 2026-07-22).** With the state-driven overlay, closing Projects or Config is a Dismiss that removes the overlay and reveals the still-mounted main view — no navigation and no recorded-URL return. The close-to-last-main-view affordance built here is removed. Work and report below are unchanged historical record — see implementation_plan.md § Revision 3.

## What to implement
Replace the browser-history "Back" affordance on the two top-level closable
views — the Projects management page and the system Config page — with a
"close" affordance that returns to the recorded last main view (Task Manager or
Sessions).

Each page's close control navigates to the last main-view URL recorded by
TASK-006 (path + query), rather than stepping through browser history. When no
main view has been recorded yet (e.g. a cold load straight into a closable
view), the control falls back to `/`, which the existing root redirect resolves
to a Task Manager destination.

Because the recorded URL carries the full main-view state, closing returns the
user to exactly the view they were in — including a deep Task Manager URL with
an open story slide-over or task modal, or the Sessions view — independent of
how they reached the closable view or how deep the browser history is.

Project Settings (`/projects/:id/settings`) is a sub-page of the Projects
closable view and keeps its existing fixed back-link to `/projects` — it is
outside this task's scope.

## Scope
The Projects management page and the system Config page (their back/close
controls only). Consumes the last-main-view record and classification from
TASK-006. Frontend only.

## Dependencies
TASK-006 (provides the recorded last-main-view URL and the classification).

## Acceptance Criteria
- [ ] Closing the Projects page returns to the recorded last main view (a deep Task Manager URL is restored exactly; a Sessions origin returns to Sessions)
- [ ] Closing the Config page returns to the recorded last main view under the same rules
- [ ] On a cold load directly into a closable view with no recorded main view, closing falls back to `/` and lands on a Task Manager destination
- [ ] Neither close control relies on browser history (`navigate(-1)` is no longer used on these two pages)
- [ ] The close control stays keyboard-accessible with a visible focus indicator, consistent with the existing affordance it replaces
- [ ] `npx tsc --noEmit` passes

## Supersedes (in part)
- BUG-005 (the `navigate(-1)` Back button added to the Projects page) and the equivalent `navigate(-1)` Back button on the Config page.
Leave the BUG-005 report as the historical record; do not edit it. The paused manual-qa re-verification of BUG-005 is superseded by this task and waits until it ships.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-21
**What was done**: Replaced the `navigate(-1)` browser-history "Back" button
on both `ProjectsPage.tsx` and `SettingsPage.tsx` with a "Close" control that
reads the last-recorded main-view URL via TASK-006's `useLastMainViewUrl()`
hook and navigates there (`navigate(lastMainViewUrl ?? "/")`). On a cold load
with nothing recorded, this resolves to `/`, which `RootRedirect` already
sends to a Task Manager destination. Both pages now depend only on the
recorded state, not on browser history depth or how the closable view was
reached. `ProjectSettingsPage.tsx`'s fixed `Link to="/projects"` back-link was
left untouched, per the task's stated scope — it is a sub-page of the
Projects closable view, not a closable view itself.
**Deviations from plan**: The visible button label and `aria-label` changed
from "Back" / "Go back to previous page" to "Close" / "Close and return to
the last view" on both pages, to match the "close" mental model this task
implements (the control no longer steps through history — it returns to a
specific recorded destination). The task description and ACs did not mandate
a label change, but keeping the word "Back" would have been misleading now
that the mechanism is no longer history-based. The `ArrowLeft` icon and all
visual/focus styling are unchanged, so the affordance still reads as
equivalent parity between the two sibling top-bar destinations.
**Technical decisions made**: Reused `useLastMainViewUrl()` as-is (no new
hook) — it already excludes closable-view routes from recording (TASK-006),
so it was safe to consume directly in both pages without additional
filtering. Kept `useNavigate` for the actual navigation call rather than a
`Link`, since the destination is dynamic (computed from local storage) and
not statically known at render time, consistent with `TopBar.tsx`'s existing
`navigate(lastTaskManagerUrl ?? "/")` pattern for the mode switcher.
**Code locations**:
- `frontend/src/features/projects/ProjectsPage.tsx` — Close button replacing
  the BUG-005 Back button
- `frontend/src/features/settings/SettingsPage.tsx` — Close button replacing
  the original Back button
**Technical debt noted**: None. Convention Gaps: none noted.

**Verification**: `npx tsc --noEmit` passes with no errors. `npx vitest run` —
220 passed / 2 failed, matching the 220/2 baseline captured before this task's
changes (no regressions introduced). The 2 pre-existing failures are in
`src/app/TopBar.test.tsx` (`getByRole("button", { name: "Go to Config" })` —
stale expectation predating TASK-006's `NavLink`-based Config entry, which
renders as a `link`, not a `button`); out of this task's scope and owned by
qa-automation's TASK-008, which re-aligns the top-bar tests.

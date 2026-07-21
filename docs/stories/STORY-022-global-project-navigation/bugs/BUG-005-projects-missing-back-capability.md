---
id: BUG-005
story: STORY-022
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-005: Global Projects entry has no way back to the previous view, unlike the global Config entry

## Description
Reported by the user: "projects should have the same 'back' capability as
'config'. Otherwise I can't go to task view." The global "Config" (Settings)
top-bar entry and the global "Projects" top-bar entry (STORY-022 TASK-001) are
siblings in the same always-visible top bar, reachable from any app state —
including from deep inside a Story slide-over or Task Detail modal. Once on
`/settings`, the page itself offers a "Back" button that returns the user to
exactly the view they came from (via browser history). `/projects` has no
equivalent — once there, the only way back to a Task/Story view is the
browser's own native back button (not an in-app affordance) or re-navigating
from scratch (mode switcher → last project, or picking a project again from
the list).

## Steps to Reproduce
1. Navigate into a project's Stories view and open a story (or a task inside
   it), e.g. `/projects/:id/stories/:storyId`.
2. Click the global "Config" entry in the top bar → lands on `/settings`.
3. Click the "Back" button on the Settings page → returns to the exact
   story/task view from step 1.
4. Repeat steps 1–2, but click the global "Projects" entry instead of
   "Config" → lands on `/projects`.
5. Observe: the Projects Management page has no "Back" button (or any other
   in-app affordance) to return to the story/task view from step 1.

## Expected Result
The Projects Management page (`/projects`) offers the same in-app "Back"
affordance as the Settings page, so navigating there from any app state and
then going "Back" returns the user to exactly where they were.

## Actual Result
`frontend/src/features/projects/ProjectsPage.tsx` renders only a page heading,
the project list, and the create/edit/delete modals — no back-navigation
control of any kind. `frontend/src/features/settings/SettingsPage.tsx`, by
contrast, renders a "Back" button (`onClick={() => navigate(-1)}`) above its
heading. The two global top-bar entries are visually and behaviorally
equivalent (STORY-022's own acceptance criteria describe Projects as sitting
"near the Settings entry" and reachable identically from any mode), but only
one of the two destination pages actually gives the user a way back.

## Additional Info
- This is not a regression introduced by TASK-001 in the sense of breaking
  something that worked before — `/projects` never had a back button. The gap
  became user-visible specifically because TASK-001 made Projects reachable
  from every app state via a single, always-visible top-bar entry (previously
  it was reached only from the Task Manager sidebar, a shallower context to
  return from). Settings already had its "Back" button from an earlier story
  (STORY-016), so pairing the two entries in the same top bar exposed the
  asymmetry.
- `frontend/src/features/settings/ProjectSettingsPage.tsx` (`/projects/:id/settings`,
  also added in this story, TASK-004) does have a back-link, but it is a fixed
  `Link to="/projects"` — appropriate there because that screen has exactly
  one launch surface (the Projects Management page). `/projects` itself has
  many possible launch surfaces (any Task Manager or Sessions view, via the
  global top-bar entry), so a fixed destination is not viable — it needs
  `navigate(-1)`, matching Settings' own mechanism.

## Fix

Root cause: `ProjectsPage.tsx` was never given a back-navigation control. This
was not a defect in TASK-001 itself (its scope was limited to relocating the
nav entry and did not include the destination page's own affordances) — it is
a pre-existing gap that TASK-001 made reachable from anywhere, and therefore
noticeable, by pairing "Projects" with "Config" in the same always-visible top
bar without giving the two destinations equivalent return-navigation behavior.

Fix: added a "Back" button to `ProjectsPage.tsx`, placed above the page
heading, using the exact same mechanism as `SettingsPage.tsx` — an
`ArrowLeft`-icon button that calls `navigate(-1)` (React Router's programmatic
browser-history back), with matching classes/`aria-label` for visual and
accessibility consistency between the two sibling top-bar destinations.
`navigate(-1)` is the right choice (over a fixed `Link`) because `/projects` is
reachable from many different views (any Task Manager or Sessions screen), not
one fixed launch surface — the previous entry in the browser history is
whatever view the user was actually on, which is exactly what "go to task
view" requires.

**Code locations**: `frontend/src/features/projects/ProjectsPage.tsx`

**Verification**: `npx tsc --noEmit` passes; `npx vitest run` — 222 passed / 0
failed, matching the 222/0 baseline before this fix (no regressions
introduced; no pre-existing failures to carry forward).

## Re-verification (qa-automation, 2026-07-21, post TASK-006/007/008)
The `navigate(-1)` "Back" button fix recorded above was explicitly superseded
by TASK-007, which replaced it with a "Close" control on `ProjectsPage.tsx`
that navigates to the recorded last-main-view URL (`useLastMainViewUrl()`)
instead of stepping through browser history — a strictly stronger fix for the
same underlying gap ("no way back to the previous view"). Confirmed via
`ProjectsPage.test.tsx`: renders a "Close" control (not "Back"), restores a
deep Task Manager URL exactly, returns to Sessions when that was the
recorded origin, and falls back to `/` on a cold load. Full frontend suite
(`npx vitest run`) — 260/260 passing. Status → `resolved`.

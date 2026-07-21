---
id: BUG-001
story: STORY-022
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-001: Global Projects top-bar entry shows aria-current="page" on nested project routes, not just /projects

## Description
TASK-002's spec requires: "`aria-current="page"` is set on the Projects entry
when the active route is `/projects`, and absent when it is not." The Projects
`NavLink` in `frontend/src/app/TopBar.tsx` has no `end` prop, so react-router's
default (non-exact) matching treats every route under `/projects/*` — including
a specific project's Stories/Board/Milestones/Settings views — as a match for
`to="/projects"`. As a result, the Projects top-bar entry is shown as the
"current page" while the user is deep inside a specific project, which is
inconsistent with the intended current-page semantics (the entry should only
look active on the Projects **management** page itself).

Note: `frontend/src/app/Layout.tsx` (dead code, superseded) shows the project
was already aware of this exact react-router pitfall — it sets
`end={item.to === "/"}` on its home NavLink specifically to prevent it from
matching every sub-route. The same `end` prop was not applied to the new
Projects NavLink added in TASK-001.

## Steps to Reproduce
1. Navigate to `/projects/<any-project-id>/stories` (or `/board`, `/milestones`,
   `/settings`) in Task Manager mode.
2. Inspect the "Projects" link in the top bar.

## Expected Result
`aria-current` is absent on the Projects top-bar entry — the user is inside a
project, not on the Projects management page.

## Actual Result
`aria-current="page"` is present on the Projects top-bar entry for every route
under `/projects/*`, not just the literal `/projects` route.

## Additional Info
Reproduced automatically in `frontend/src/app/TopBar.test.tsx` via
`test.fails("omits aria-current on the Projects entry when not on /projects (BUG-001 — currently active on nested project routes too)", ...)`
— kept as an expected-fail so the suite stays green; flip it back to a normal
`it` once fixed. Likely one-line fix: add `end` to the Projects `NavLink` in
`frontend/src/app/TopBar.tsx`.

## Fix

Added the `end` prop to the Projects `NavLink` in `frontend/src/app/TopBar.tsx`,
so react-router now requires an exact match against `/projects` before marking
the entry active — nested routes like `/projects/:id/stories` no longer set
`aria-current="page"`.

The `test.fails` placeholder in `frontend/src/app/TopBar.test.tsx` was flipped
back to a normal `it("omits aria-current on the Projects entry when not on
/projects (BUG-001)", ...)`.

**Verification**: baseline run of `frontend/src/app/TopBar.test.tsx` was 17
passed / 1 expected-fail; after the fix, all 18 tests pass. Full frontend
suite (`npx vitest run`) — 213 passed across 20 files, no regressions.

**Re-verified (qa-automation, Execute mode, 2026-07-21)**: full frontend
suite re-run — 213 passed across 20 files, including the flipped `it` in
`TopBar.test.tsx`. Confirmed resolved.

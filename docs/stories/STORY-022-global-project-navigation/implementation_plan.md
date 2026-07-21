# Implementation Plan: STORY-022 — Global Project Navigation Entry

## Context
SESSION-018 (product-strategist) established that Project is the universal top-level anchor for every module in the utility — Tasks and Sessions today, any future module tomorrow — rather than a construct owned by or nested inside the Task Manager module. Today the only in-app path to the Projects management page (`/projects`) is the `⚙ Manage Projects` link buried in the Task Manager's collapsible left sidebar, which is invisible in Sessions mode and one level deeper than Settings (which sits directly in the always-visible top bar).

This is an interim, frontend-only story that relocates that single navigation entry to the persistent top bar so project management is reachable identically from any mode, ahead of a broader module-agnostic navigation redesign. It touches no backend, no API contract, and no data model.

A second, independent change was folded into this story during SESSION-020 (before implementation started): from the Projects Management page (`/projects`), clicking a project's name now lands on that project's **Settings** view instead of its **Stories** view — collapsing the "manage the project" and "configure the project" journeys into one entry point per project row. This is a landing-destination swap scoped to that single click target only; every other way of entering a project (notably the Task Manager sidebar) is unaffected and continues to land on Stories. No functionality is removed — Stories, Board, and Milestones stay reachable through the project's existing sub-navigation tabs once inside it.

## Technical Approach
The persistent top bar (`RootLayout` → `TopBar`) is the only chrome present in every mode, so the global Projects entry lives there, in the right-side region alongside the existing Settings/Config action. The entry is a router-driven navigation link to `/projects`.

Active-page indication reuses the app's established pattern: a React Router `NavLink` whose `isActive` state drives both the visual highlight and `aria-current="page"` — the same mechanism used by the `ProjectShell` sub-nav tabs and the sidebar project list. This keeps the current-page behavior consistent with the rest of the app without introducing a new pattern. Keyboard focus uses the same `focus-visible` ring already applied to the top bar's controls.

Because the entry must be visible in both Task Manager and Sessions modes, the right-side region of the top bar must render unconditionally (today it renders only in Task Manager mode). The Projects entry is mode-independent — its presence, position, and behavior do not vary with the active mode or with route state (an open slide-over or task modal). Navigating to `/projects` is ordinary top-level router navigation, so any open Story slide-over or Task Detail modal is dismissed as a natural consequence of the route change — no special dismissal logic is required.

The second half of the change removes the now-redundant `Manage Projects` link (and its supporting sub-component / icon import) from the Task Manager left sidebar, so exactly one path to project management remains. The sidebar otherwise keeps the project list and collapse toggle unchanged.

Both halves land together as one atomic relocation: the AC "exactly one way to reach project management" is only satisfied when the entry is added in the top bar and removed from the sidebar in the same change.

**Project-name landing destination (separate module).** On the Projects Management page, each project-name entry navigates the user into that project. Today that navigation resolves to the project's Stories view; it must instead resolve to the project's Settings view. This is a self-contained change to the project-name click target in the Projects Management list — a different surface from the top-bar/sidebar relocation above. The two changes share the story but touch different modules and carry no dependency on each other. The change is scoped strictly to this one click target: the Task Manager sidebar's project selection (combobox and project list) keeps landing on Stories, and the router's default landing for a bare project URL is left as-is so the sidebar's behavior is untouched — the new destination is set explicitly at the click target rather than by moving the shared default.

## Ordered Tasks
1. TASK-001: Relocate the Projects navigation entry to the global top bar — add a mode-independent, active-aware, keyboard-accessible Projects link to the top bar's right-side region; remove the Manage Projects link from the Task Manager left sidebar. (frontend-developer)
2. TASK-003: Change the Projects Management project-name landing destination to the project's Settings view — retarget the project-name click on `/projects` to the project's Settings view, leaving the Task Manager sidebar's project selection landing on Stories. Independent of TASK-001. (frontend-developer)
3. TASK-002: Update automated component tests for the relocated Projects entry and the project-name landing destination (depends on TASK-001 and TASK-003) — extend the top-bar tests for the new global entry and its active/both-modes behavior; update the sidebar tests to reflect the removed link and confirm sidebar selection still lands on Stories; add coverage that the Projects Management project-name click lands on Settings. (qa-automation)

## Planned ADRs
None. Navigation placement of an existing link is spec-mandated UI work following established patterns — no ecosystem choice, no hard-to-reverse or non-obvious trade-off.

| Decision Area | Trigger Condition |
|---|---|
| (none anticipated) | — |

## Constraints & Gotchas
- **Both modes, identical placement.** The top bar's right-side region currently renders only in Task Manager mode; it must render in both modes so the Projects entry is always present. The entry's position and behavior must not change between modes or when a slide-over/modal is open.
- **Settings visibility is out of scope.** The existing Settings/Config action stays gated to Task Manager mode as it is today — this story adds Projects only and does not change Settings' behavior. Consequence: in Sessions mode the Projects entry appears without a sibling Settings entry. That asymmetry is acceptable for this interim story; do not expand scope to make Settings global.
- **Reuse the existing active-page pattern.** Use React Router `NavLink` `isActive` → `aria-current="page"` plus the existing top-bar `focus-visible` ring, matching `ProjectShell` tabs and the sidebar project list. Do not invent a new active-state or focus mechanism.
- **No manual dismissal logic.** Dismissal of an open Story slide-over or Task Detail modal on navigation to `/projects` falls out of normal router navigation — do not add bespoke close handling for it.
- **Full removal of the sidebar link.** Remove the `Manage Projects` link along with any sub-component and icon import that exist solely to support it; leave the project list and collapse toggle untouched.
- **Existing tests assert the old behavior.** `TopBar.test.tsx` (Settings button by mode) and `ProjectSidebar.test.tsx` ("Manage Projects link" / "still present when empty") encode pre-STORY-022 expectations and must be brought in line with the new behavior in TASK-002.
- **Landing-destination change is scoped to one click target.** Only the project-name click on the Projects Management page moves to Settings. The Task Manager sidebar's project selection must continue to land on Stories, and the router's default landing for a bare project URL must stay unchanged — set the new Settings destination explicitly at the click target, do not repoint the shared default. Verify the sidebar's Stories landing still holds after the change.
- **No functionality removed by the landing swap.** Stories, Board, and Milestones remain reachable via the project sub-navigation tabs once inside the project; this change only alters where the project-name click first lands. A project with no settings overrides lands on its Settings view showing values inherited from system defaults — that pre-existing inherited state is unaffected.

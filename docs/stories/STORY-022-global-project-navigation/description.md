---
status: Accepted
type: feature
priority: P1
date: 2026-07-21
---

# STORY-022: Global Project Navigation Entry

## Desired Outcome
Project management is reachable from anywhere in the application — regardless of whether the user is currently in Task Manager mode or Sessions mode — via a persistent entry in the app's top bar, near Settings. The navigation link that currently exists only inside the Task Manager's left sidebar is removed, so there is exactly one way to reach project management, and it works the same from any mode.

Additionally, from the Projects Management page itself, clicking a project's name now opens that project's Settings view directly instead of its Stories view — collapsing what used to be two separate journeys ("manage the project" vs. "configure the project") into a single entry point per project row. All other ways of entering a project (e.g. the Task Manager sidebar) are unaffected and continue to land on Stories.

## Context
SESSION-018 (product-strategist) confirmed that Project is the universal top-level anchor for every module in the utility (Tasks and Sessions today, any future module tomorrow) — not a construct owned by or nested inside the Task Manager module. Project management must be reachable independent of any single module's view. Today, the only in-app way to reach the Projects management page (`/projects`) is the `⚙ Gestisci progetti` link inside the Task Manager's collapsible left sidebar — invisible while in Sessions mode, and one level deeper than Settings, which sits directly in the always-visible top bar. This story is an interim step that relocates that navigation entry to a global, mode-independent location, ahead of any broader module-agnostic navigation redesign.

<!-- amended: 2026-07-21 (SESSION-020) --> During SESSION-020, before implementation started, the scope was expanded to also change what happens when a project is clicked from within the Projects Management page: instead of landing on that project's Stories view, it now lands on that project's Settings view. The two changes ship together in this story. Note for the architect: this amendment was made after TASK-001/TASK-002 were already planned and approved — the implementation plan needs to be revisited to account for the added navigation-target change before work resumes.

## Acceptance Criteria
<!-- Reconciled 2026-07-22 (spec-writer, per architect's Revision 3 flag): the criteria below are restated in terms of the shipped state-driven overlay model (ADR-025). The originally-drafted, URL-based criteria (navigation to `/projects`, current-page indication for `/projects`, URL updating to `/projects`, navigation to `/projects/:id/settings`, "reachable through the existing sub-navigation tabs" from a Settings landing) described Revisions 1–2, which were superseded before release. See implementation_plan.md § Revision 3 and TASK-009/TASK-010 for the full history. -->
- [x] A "Projects" entry and a "Config" entry are both visible in the app's persistent top bar, in both Task Manager mode and Sessions mode
- [x] Clicking the global Projects entry opens the Projects overlay (a slide-over panel covering, not replacing, the current main view) showing the project list; the list's own behavior (create, edit, delete) is unchanged. The URL does not change.
- [x] The `⚙ Manage projects` link previously inside the Task Manager left sidebar is removed; there is no longer a second, mode-dependent path to project management
- [x] The global Projects entry shows an open/active indication while its overlay is open, and the Config entry likewise while its own overlay is open — driven by overlay state, not by route matching
- [x] The global Projects and Config entries are keyboard-accessible with a visible focus indicator, consistent with the rest of the top bar
- [x] Clicking a project's name in the Projects overlay's project list pushes that project's Settings editor as the second level of the same overlay (Back returns to the list) — it does not navigate to a route and does not land on the project's Stories view
- [x] From the Settings level, an "Open in Task Manager" action navigates the main view to that project's Stories (with the Stories/Board/Milestones sub-navigation available) and dismisses the overlay in the same step — the in-app path from "configure the project" to "work the project," including for a project not previously opened this session (BUG-006)
- [x] The Task Manager sidebar's project combobox and project list continue to navigate to a project's Stories view when a project is selected — the project-name-in-overlay landing-destination change does not affect the sidebar

## Edge Cases & Error Scenarios
<!-- Reconciled 2026-07-22 (spec-writer): restated in overlay terms; see note above. -->
- [x] Opening the Projects or Config overlay while a Story Detail slide-over or Task Detail modal is open does **not** dismiss it: the main view (including the open slide-over/modal) stays mounted and dimmed underneath the overlay, which renders on top of both. Dismissing the overlay reveals that main view exactly as it was. The URL never changes when the overlay opens or closes.
- [x] The global Projects entry remains visible and functional when no projects exist yet; on a fresh install with zero projects, the app lands on an empty Task Manager main view with the Projects overlay automatically opened so the first project can be created
- [x] Switching between Task Manager mode and Sessions mode does not hide or move the global Projects or Config entries — their position and behavior are identical in both modes
- [x] Choosing a project with no settings overrides yet from the Projects overlay's list lands on its Settings level showing all values inherited from system defaults — this pre-existing empty/inherited state is unaffected by this story
- [x] The Projects/Config overlay remains fully visible and interactive even when opened while a Task Detail modal is already the topmost open surface (on top of a Story slide-over) — it renders above both, and `Escape` closes one overlay level per press without cascading to the modal/slide-over beneath it (BUG-007)
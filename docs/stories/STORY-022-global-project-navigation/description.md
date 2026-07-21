---
status: Pending Approval
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
- [ ] A "Projects" entry is visible in the app's persistent top bar, in both Task Manager mode and Sessions mode, positioned near the existing Settings entry
- [ ] Clicking the global Projects entry navigates to the existing Projects management page (`/projects`); the page's own behavior (list, create, edit, delete) is unchanged
- [ ] The `⚙ Manage projects` link previously inside the Task Manager left sidebar is removed; there is no longer a second, mode-dependent path to project management
- [ ] The global Projects entry shows an active/current-page indication when the user is already on `/projects`, consistent with how other current-page indicators behave elsewhere in the app
- [ ] The global Projects entry is keyboard-accessible with a visible focus indicator, consistent with the rest of the top bar
- [ ] Clicking a project's name in the Projects Management page (`/projects`) navigates to that project's Settings view (`/projects/:id/settings`) instead of its Stories view (`/projects/:id/stories`)
- [ ] Once inside a project via this entry point, the Stories, Board, and Milestones views remain fully reachable through the existing project sub-navigation tabs — no functionality is removed, only the landing destination from the Projects Management page changes
- [ ] The Task Manager sidebar's project combobox and project list continue to navigate to a project's Stories view when a project is selected — the landing-destination change is scoped only to the project-name click target on the Projects Management page

## Edge Cases & Error Scenarios
- [ ] Navigating to Projects via the global entry while a Story Detail slide-over or Task Detail modal is open behaves like any other top-level navigation away from a project: the slide-over/modal is dismissed and the URL updates to `/projects`
- [ ] The global Projects entry remains visible and functional when no projects exist yet (empty state on the Projects page is unaffected by this story)
- [ ] Switching between Task Manager mode and Sessions mode does not hide or move the global Projects entry — its position and behavior are identical in both modes
- [ ] Clicking a project name for a project that has no settings overrides yet lands on its Settings view showing all values inherited from system defaults — this pre-existing empty/inherited state is unaffected by this story
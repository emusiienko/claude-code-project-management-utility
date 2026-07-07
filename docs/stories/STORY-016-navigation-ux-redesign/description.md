---
status: Planned
type: feature
priority: P0
date: 2026-07-07
---

# STORY-016: Navigation & UX Redesign

## Desired Outcome

The orchestrator can navigate the Task Manager through a redesigned shell: an app switcher separates Task Manager from Sessions, a collapsible left sidebar provides project context, and a per-project sub-navigation gives access to Stories, Board, Milestones, and Settings. Stories open in a full-screen slide-over from the right — keeping the list context visible in the background — with the task kanban and a collapsible description/attachments/comments panel inside.

## Context

STORY-004 (Story Management) introduced the Stories list at `/projects/:id`. The current navigation is a flat horizontal bar (`Agent Utility | Projects | Sessions | Settings`) that mixes two conceptually separate apps (Task Manager and Sessions) and gives no project-level context once inside a project. Settings has two tabs (System Defaults and Project Overrides) at `/settings`, but Project Overrides logically belong inside the project context.

This story replaces the entire navigation shell to match the UX design agreed in the 2026-07-07 UX review. It builds directly on STORY-004 with all existing CRUD functionality preserved.

**Board tab scope note:** The Board tab in this story shows all project stories as a kanban (no milestone filter). The milestone-based enabling/disabling and filtering behaviour is deferred to STORY-012, which introduces milestone statuses.

## Acceptance Criteria

- [ ] The flat nav bar (`Agent Utility | Projects | Sessions | Settings`) is removed and replaced by a top bar containing: an app switcher combobox on the left and a `⚙ Settings` text button on the right (Task Manager mode only)
- [ ] The app switcher shows `Task Manager` when in Task Manager mode and `Sessions` when in Sessions mode; switching between them replaces the entire content area
- [ ] In Task Manager mode, a collapsible left sidebar is rendered; it contains a project combobox at the top, a list of all projects with the active one highlighted, and a `⚙ Gestisci progetti` link at the bottom navigating to `/projects`
- [ ] A collapse/expand toggle button (`◄`/`▶`) on the sidebar edge collapses and expands it; when collapsed, only the toggle button is visible and the main content fills the full width; the state persists in browser local storage
- [ ] When a project is active, a horizontal sub-navigation bar is shown with four tabs: `Stories`, `Board`, `Milestones`, `Settings`; the active tab is visually highlighted
- [ ] The `⚙ Settings` top-bar button navigates to `/settings` which shows only system-level dictionary defaults (the "Project Overrides" tab is removed from this page)
- [ ] `/projects` is a full-screen management page with no sidebar and no sub-nav; it lists all projects in a table with create/edit/delete actions (existing CRUD functionality unchanged); accessible via the `⚙ Gestisci progetti` sidebar link
- [ ] The Stories list is accessible at `/projects/:id/stories` (sub-nav tab: `Stories`); the existing filter bar, table, and CRUD actions from STORY-004 are preserved
- [ ] The Board tab (`/projects/:id/board`) shows all project stories as a kanban with one column per story status; drag-and-drop between columns updates the story status; each card shows title, labels, and task aggregate; clicking a card opens the Story Detail slide-over
- [ ] The `Settings` sub-nav tab navigates to `/projects/:id/settings` and shows the project dictionary overrides (previously the "Project Overrides" tab in `/settings`); existing override/clear/save behaviour is preserved
- [ ] Clicking a story title (from Stories list or Board) opens a slide-over panel that animates in from the right, covering the sidebar and sub-nav; the background content is dimmed; the URL updates to `/projects/:id/stories/:storyId`
- [ ] The Story Detail slide-over shows: a fixed header with breadcrumb `← Stories`, story title, status badge, `✏ Edit` button, and `✕` close button; a main area with the task kanban (one column per task status); a collapsible right panel with story description (rendered Markdown), attachments list, and comments list
- [ ] The right panel inside the slide-over is toggled with a `‹`/`›` button; its open/closed state persists in browser local storage per story
- [ ] Closing the slide-over via `✕` button or `Escape` key restores the previous URL (Stories list or Board); the `← Stories` breadcrumb also closes the slide-over and returns to the Stories list
- [ ] Navigating directly to `/projects/:id/stories/:storyId` renders the project view with the slide-over already open
- [ ] In Sessions mode (`/sessions`), no sidebar and no sub-nav bar are rendered; the `⚙ Settings` top-bar button is hidden
- [ ] `/` redirects to `/projects/:lastId/stories` using the last visited project ID from browser local storage, or to `/projects` if no project has been visited

## Edge Cases & Error Scenarios

- [ ] No projects exist: `/projects` shows an empty state with a prominent "Create your first project" call-to-action; the sidebar shows an empty project list and the `⚙ Gestisci progetti` link
- [ ] Navigating to `/projects/:id/stories` for a non-existent project ID shows an inline "Not found" message with a link back to `/projects`
- [ ] Navigating directly to `/projects/:id/stories/:storyId` for a non-existent story renders the project view with an inline "Not found" message inside the slide-over area
- [ ] Navigating directly to `/projects/:id/board` works correctly regardless of sidebar state
- [ ] The sidebar collapsed state does not affect Board usability — all columns remain accessible via horizontal scroll if needed
- [ ] Switching app mode (Task Manager → Sessions → Task Manager) returns to the last active project and sub-nav tab
- [ ] The `Milestones` sub-nav tab navigates to `/projects/:id/milestones`; since STORY-012 is not yet implemented, this route renders the existing placeholder screen (no regression from current behaviour)
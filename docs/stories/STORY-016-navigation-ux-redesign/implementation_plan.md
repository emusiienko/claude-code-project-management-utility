# Implementation Plan: STORY-016 — Navigation & UX Redesign

## Context

STORY-004 introduced the Stories list at `/projects/:id` behind a flat horizontal nav bar
(`Agent Utility | Projects | Sessions | Settings`). That bar mixes two conceptually separate
apps (Task Manager and Sessions), offers no project-level context once inside a project, and
places project dictionary overrides under global `/settings` where they do not belong.

This story replaces the entire navigation shell to match the UX design agreed in the 2026-07-07
UX review: an app switcher separates Task Manager from Sessions, a collapsible left sidebar
carries project context, and a per-project sub-navigation exposes Stories, Board, Milestones,
and Settings. Stories open in a full-screen slide-over from the right, keeping the list context
visible behind a dimmed backdrop, with a task kanban and a collapsible description/attachments/
comments panel inside.

This is a **frontend-only** restructuring. It preserves all existing CRUD functionality from
STORY-002 (Settings) and STORY-004 (Stories) and adds a Board view over the already-existing
Story data. The Board tab shows all project stories as a kanban with no milestone filter — the
milestone-based enabling/filtering is deferred to STORY-012.

## Technical Approach

**No backend, contract, or dependency changes.** The redesign reorganizes routing and layout
composition around the existing Project and Story REST/data-fetching layers. `@dnd-kit/*` and
`react-router-dom` are already installed; no new npm packages are introduced.

**Layered layout shells via nested routing.** The route tree is restructured into three nesting
levels so that layout concerns compose top-down and each leaf route only renders its own content:

- **Flat root layout** — owns the top bar (app switcher + Settings button) and hosts an outlet.
  `/projects`, `/sessions`, and `/settings` render directly in this outlet with no project chrome.
- **AppShell (Task Manager mode)** — renders the collapsible project sidebar alongside its outlet.
  All project-scoped routes (`/projects/:id/*`) render inside AppShell so the sidebar is always
  present and the active project is highlighted.
- **ProjectShell** — renders the four-tab project sub-navigation (Stories, Board, Milestones,
  Settings) with active-tab highlighting, plus a nested outlet for the tab content. Unknown
  project IDs surface an inline "Not found" message with a link back to `/projects`.

Leaf routes (Stories list, Board, Milestones placeholder, Project Settings) render in the
ProjectShell outlet. The Story Detail slide-over is a **nested child route** of the Stories list
(`/projects/:id/stories/:storyId`), so the list stays mounted behind the dimmed slide-over and
deep-linking renders the project view with the slide-over already open.

**Persisted UI preferences via a shared hook.** A new `useLocalStorage` hook in the shared hooks
directory provides a typed, reactive wrapper over browser local storage. It backs three pieces of
persisted state: sidebar collapsed/expanded, the last-visited project ID (used by the `/` redirect),
and the slide-over right-panel open/closed state keyed per story.

**Board drag-and-drop with optimistic update.** The Board composes one column per effective story
status; each card is draggable via `@dnd-kit`. On drop into a different column, the board issues the
existing story-update operation (`PUT /v1/stories/:id`) with an optimistic cache update so the card
moves immediately, rolling back on error. Cards are clickable and open the Story Detail slide-over.
Because status columns derive from the project's effective `story_statuses` dictionary, the board
stays consistent with the Settings dictionary without hardcoding a status set.

**Settings restructure — move, do not rebuild.** The global `/settings` page keeps only system-level
dictionary defaults; its "Project Overrides" tab is removed. The project overrides UI is relocated
to the `Settings` sub-nav tab at `/projects/:id/settings`, reusing the existing ProjectSettings
component unchanged. This is a relocation of already-working UI — the known clear-override contract
gap (service has `clear_project_setting` but no REST/MCP route exposes it) is explicitly **out of
scope** and is neither fixed nor worsened here.

**Data flow for a story open/close:**
1. User clicks a story title (Stories list) or a card (Board) → navigate to the nested
   `/projects/:id/stories/:storyId` route.
2. The slide-over child route mounts over the still-mounted list/board, animates in from the right,
   dims the backdrop, and loads the story detail from the existing story query.
3. Closing via `✕`, `Escape`, or the `← Stories` breadcrumb navigates back to the parent route
   (Stories list or Board), unmounting the slide-over and restoring the prior URL.

## Ordered Tasks

1. TASK-001: Shell foundation — establish the three-level nested routing hierarchy, the `/` →
   last-project redirect, and the shared `useLocalStorage` hook.
2. TASK-002: Top bar + app switcher (depends on TASK-001) — Task Manager / Sessions combobox and the
   `⚙ Settings` button in the flat root layout.
3. TASK-003: Collapsible project sidebar (depends on TASK-002) — project combobox, project list with
   active highlight, `⚙ Gestisci progetti` link, and a collapse toggle persisted in local storage.
4. TASK-004: Project sub-nav + ProjectShell (depends on TASK-003) — four sub-nav tabs with active
   highlight and an inline "Not found" state for unknown project IDs.
5. TASK-005: `/projects` full-page management (depends on TASK-002) — move the projects list outside
   the shell (no sidebar, no sub-nav) with an empty state.
6. TASK-006: Stories list at `/projects/:id/stories` (depends on TASK-004) — remount the existing
   StoriesPage under the new path; story titles become clickable to open the slide-over.
7. TASK-007: Board view (depends on TASK-004) — story kanban by status with drag-and-drop status
   update (optimistic) and clickable cards.
8. TASK-008: Story Detail slide-over (depends on TASK-006) — nested route with breadcrumb/edit/close
   header, task-kanban placeholder, collapsible right panel persisted per story, deep-link, and
   Escape-to-close.
9. TASK-009: Settings restructure (depends on TASK-004) — remove the "Project Overrides" tab from
   `/settings` and expose overrides at `/projects/:id/settings`, reusing ProjectSettings.
10. TASK-010: qa-automation — automated tests for the new navigation, Board drag-and-drop, slide-over
    deep-linking, and Settings restructure.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Navigation model change: flat 3-item top nav → app switcher + collapsible sidebar + per-project sub-nav with nested routing shells | On acceptance — this is an ecosystem-level, hard-to-reverse restructuring of the frontend shell that a new engineer must understand to work safely on routing and layout |

## Constraints & Gotchas

- **Frontend only.** No backend code, no `docs/api-contract.md` changes (contract stays LOCKED at
  v1.0), no new npm dependencies. Board status updates use the existing `PUT /v1/stories/:id`.
- **Board status columns are dictionary-driven.** Derive columns from the project's effective
  `story_statuses` dictionary — do not hardcode a status list. This keeps the board aligned with the
  Settings dictionary and with STORY-012's future milestone work.
- **clear-override gap is out of scope.** TASK-009 relocates the existing project-overrides UI only.
  The known end-to-end clear-override gap (frontend calls a non-existent
  `DELETE /projects/:id/settings/:key`; no REST/MCP route exposes the service's `clear_project_setting`)
  is neither fixed nor made worse — it needs a separate contract revision.
- **Slide-over must keep the list mounted.** Model the Story Detail as a nested child route of the
  Stories list so the background list/board stays mounted and dimmed, and so a direct visit to
  `/projects/:id/stories/:storyId` renders the project view with the slide-over already open.
- **Per-story panel persistence.** The slide-over right panel's open/closed state persists per story
  (keyed by story ID), not globally.
- **Milestones tab is a passthrough.** `/projects/:id/milestones` renders the existing placeholder
  screen — STORY-012 fills it in. No regression from current behaviour.
- **Sessions mode has no project chrome.** In `/sessions`, render no sidebar and no sub-nav, and hide
  the `⚙ Settings` top-bar button. Switching app mode returns to the last active project and sub-nav
  tab.
- **Top-level nav rule still holds.** After this redesign the shell is app-switcher-driven; do not
  reintroduce Tasks/Attachments/Comments/etc. as top-level nav entries.

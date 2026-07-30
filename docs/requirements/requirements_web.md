# Web UI Requirements

The Web UI is the browser-based interface for the human orchestrator. It is served by a Docker container with its port mapped to localhost, requires no authentication, and provides full CRUD access to all entities. It consumes the REST API defined in [Backend Requirements](requirements_backend.md).

---

## Feature List

| Feature | Description | Priority |
|---------|-------------|----------|
| Projects Management | Create, edit, delete projects; reached from anywhere via a global top-bar entry that opens a slide-over overlay (not a dedicated page) — see STORY-022 <!-- updated: 2026-07-22 (STORY-022 reconcile) --> | P0 |
| Stories View | List stories per project with filter bar | P0 |
| Board View | Kanban board of all project stories, grouped by story status; milestone-based filtering and tab-disable behaviour deferred to STORY-012 | P0 |
| Story Detail | Full-screen slide-over with task kanban + description/attachments/comments right panel | P0 |
| Task Detail View | Full-screen modal with task metadata, links, attachments, and comments | P0 |
| Project Settings View | Manage per-project dictionary overrides; view effective settings; reached as the second level of the global Projects overlay (not a dedicated page), with a bridge into that project's Task Manager view — see STORY-022 <!-- updated: 2026-07-22 (STORY-022 reconcile) --> | P0 |
| System Settings View | Manage system-level dictionary defaults; reached from anywhere via a global top-bar Config entry that opens a slide-over overlay — see STORY-022 <!-- updated: 2026-07-22 (STORY-022 reconcile) --> | P0 |
| Sessions View | A distinct top-level app-switcher mode (alongside Task Manager), mirroring Task Manager's shell with its own project-selector sidebar; a project-scoped list (topic, goal, participant_role, status, independent story/task links) with incomplete-only and linked-story filters, a dedicated Session Detail view, create/edit/archive — see STORY-009 <!-- updated: 2026-07-30 (STORY-009 reconcile) --> | P1 |
| Milestones View | List, create, edit, delete milestones within a project | P1 |
| Attachments Management | Upload documents (text or file), images, and files (PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP) to stories, tasks, or milestones; view via an in-app viewer or download; delete (immutable — no edit, no archive); each attachment has a mandatory free-form title, defaulted from the uploaded file's name where applicable and editable before submit — see STORY-021 <!-- updated: 2026-07-15 (STORY-021) --> | P1 |
| Comments Management | Create, edit, delete comments on stories, tasks, or milestones; thread rendered newest-first with a pinned Add Comment form at the top; `author_role` pre-fills from a configurable default; `@role` mention autocomplete in comment content; per-comment permalink (Copy link) and Reply actions — see STORY-008 <!-- updated: 2026-07-21 (STORY-008 reconcile) --> | P1 |
| Work Item Linking | Create and delete typed directed links between tasks (in Task Detail Modal) and between stories (in Story slide-over); linked item titles are clickable navigation targets | P1 |

---

## Navigation & Routing <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

### Layout Shell <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

The application uses a three-level layout shell hierarchy, plus an always-mounted overlay host layered above it:

1. **RootLayout** — flat root shell, always rendered. Hosts the top bar, a content outlet for the two main views (Task Manager, Sessions), and the overlay host (see Global Overlay below).
2. **AppShell** — Task Manager mode layer, rendered for all `/projects/:id/*` routes. Hosts the collapsible sidebar alongside the content outlet.
3. **ProjectShell** — per-project layer, rendered inside AppShell for all `/projects/:id/*` routes. Validates the project ID (renders an inline "Not found" state when the project does not exist), then renders the three-tab sub-nav and a nested outlet for the active tab's content.

Only two views are addressable main destinations with their own URL: **Task Manager** (a project's Stories/Board/Milestones, including an open story slide-over or task modal) and **Sessions**. Projects management and system Config are not routes — see Global Overlay below. <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

**Sessions mode** <!-- updated: 2026-07-30 (STORY-009 reconcile): built out; supersedes the earlier "no sidebar, no sub-nav, flat list" placeholder shape below -->
Sessions is a distinct top-level app-switcher mode, not a Task-Manager sub-view. It mirrors Task Manager's own shell structure rather than rendering as a single flat page: it has its own left-placed project-selector sidebar (independent last-visited-project and collapsed-state local-storage keys from Task Manager's sidebar) and, within the selected project, a nested Session Detail view reached by selecting a session from the list. There is still no cross-project Sessions view anywhere — every Sessions screen is scoped to one selected project, consistent with the mandatory `project_id` scope on the Session entity. Sessions routes live under `/sessions`, structurally separate from Task Manager's `/projects/:projectId/*` tree. The global Projects and Config overlays (see Global Overlay below) remain reachable and open-able from Sessions mode exactly as they are from Task Manager.

**Top bar** (always visible, full width):
- **App switcher** (left): native `<select>` combobox displaying the active app name (`Task Manager` or `Sessions`). Mode is derived directly from the current pathname — no recorded/remembered state. Switching to Sessions navigates to `/sessions`; switching back to Task Manager navigates to `/`, which RootRedirect resolves to the last-visited or first project's Stories, or the empty-project state.
- **Projects entry** (right): a trigger button — not a route link — that opens the Projects overlay (see Global Overlay below). Visible and in the same position in both Task Manager mode and Sessions mode. Shows an open/active indication while its overlay is open, driven by overlay state rather than route matching. <!-- updated: 2026-07-22 (STORY-022 reconcile) -->
- **Config entry** (right, beside Projects): a trigger button that opens the Config overlay (see Global Overlay below). Visible and in the same position in both Task Manager mode and Sessions mode — Config is global, not Task-Manager-only. <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

**Left sidebar — Task Manager mode** (collapsible):
- **Project combobox** at the top: native `<select>` displaying the active project name; selecting a project navigates to `/projects/:id/stories` and records the project ID as the last-visited project.
- **Project list**: all projects as buttons, with the active project highlighted via `aria-current="page"`.
- **Collapse/expand toggle** (`◄`/`▶`) anchored to the right edge of the sidebar via absolute positioning. When collapsed, only the toggle is visible and the content outlet fills the full width. Collapsed/expanded state is persisted in browser local storage under key `app:sidebar_collapsed` via the shared `useLocalStorage` hook.

**Left sidebar — Sessions mode** <!-- updated: 2026-07-30 (STORY-009 reconcile): Sessions now has its own project-selector sidebar mirroring Task Manager's, not the earlier no-sidebar placeholder -->:
- A project combobox and project list, structurally mirroring the Task Manager sidebar above, but independent of it — selecting a project in Sessions mode does not affect Task Manager's last-visited project, and vice versa (separate local-storage keys).
- Selecting a project scopes the Sessions list to that project; there is no cross-project Sessions view.

> **As-built notes (STORY-022):** the sidebar's `⚙ Manage projects` link is removed — project management is reached only through the global top-bar Projects entry, from any mode. The sidebar's project combobox and project list are unaffected and continue to navigate to a project's Stories view.

**Project sub-navigation** (rendered by ProjectShell for all `/projects/:id/*` routes):
Horizontal tab bar using React Router `NavLink` for automatic active-tab highlighting. Three tabs: <!-- updated: 2026-07-22 (STORY-022 reconcile): Settings left the tab set -->
- `Stories` → `/projects/:id/stories`
- `Board` → `/projects/:id/board`
- `Milestones` → `/projects/:id/milestones`

Project Settings is no longer part of this sub-navigation — it is reached as the second level of the Projects overlay (see Global Overlay below).

Sessions mode has its own project-selector sidebar (see above) but no per-project tab sub-navigation bar like ProjectShell's — within a selected project it shows the sessions list directly, with a nested Session Detail view reached by selecting a session. <!-- updated: 2026-07-30 (STORY-009 reconcile) -->

**RootRedirect** (index route at `/`): <!-- updated: 2026-07-22 (STORY-022 reconcile) -->
Reads the last-visited project ID from browser local storage (key `app:last_project_id`, exported constant `LAST_PROJECT_KEY` from `RootRedirect.tsx`). Redirects to `/projects/:lastId/stories` if a project ID exists. If no project has ever been visited **and at least one project exists**, it resolves to the first project's Stories the same way. If **no projects exist at all** (a fresh install), it stays at `/`, renders an empty Task Manager main view with a brief "No projects yet" message, and automatically opens the Projects overlay (see Global Overlay below) so the first project can be created — it no longer redirects to a `/projects` route, since that route no longer exists.

---

### Global Overlay: Projects & Config <!-- new: 2026-07-22 (STORY-022 reconcile) -->

Projects management and system Config are **not routes** — they have no dedicated URL. They are slide-over overlay panels, reusing the Story Detail slide-over's visual conventions, that cover the active main view (Task Manager or Sessions) without ever unmounting it. Opening or closing either overlay does not change the URL; a page refresh while an overlay is open closes it and lands on the unchanged main view underneath, the expected behavior for a modal surface.

**Opening:** clicking the top-bar Projects or Config entry opens that overlay. Each entry shows an open/active indication only while its own overlay is open (state-driven, not route-driven). While an overlay is open, the app-switcher continues to reflect the mode of the main view underneath (Task Manager or Sessions) — it is derived from the current route, unaffected by which overlay is open.

**Stack:**
- The **Projects overlay** has two levels: the **project list** (root) and, when a project is chosen from that list, that project's **Settings** editor (pushed on top). Choosing a project does not navigate — it pushes a panel level.
- The **Config overlay** has one level: the system dictionary editor (the former `/settings` content).

**Two controls, matching the Story slide-over:**
- **Back** — pops one level within the current overlay stack (e.g. from a project's Settings back to the project list). Visible only when the current stack has depth beyond its root; absent on the project list and on the single-level Config panel.
- **Dismiss** (icon control) — clears the whole overlay stack in one action from any level and reveals the main view underneath, unchanged.
- **Escape** — closes one overlay level per press via the app's shared modal-escape stack, so it composes correctly when the overlay is opened over an already-open Story slide-over or Task Detail modal (each `Escape` press closes exactly the topmost layer).

**Visual layering:** the overlay panel renders above the Story slide-over and the Task Detail modal, so it is reachable and fully interactive from any state the main view is in, including with a Task Detail modal already open on top of a Story slide-over. Full z-index order (lowest to highest): Story slide-over → Task Detail modal → the Projects/Config overlay panel and its own nested confirmation dialogs → Toast notifications → top bar.

**Project list → Settings bridge ("Open in Task Manager"):** on the Settings level of the Projects overlay, an "Open in Task Manager" action navigates the main view to that project's Stories and dismisses the whole overlay stack in the same step, revealing that project's Stories with its three-tab sub-navigation available. This works for any project, including one not previously opened this session, and does not add a sub-navigation tab bar to the Settings panel itself.

**Cold start:** see RootRedirect above — a fresh install with no projects lands on the empty Task Manager main view with the Projects overlay already open.

### Route Table <!-- updated: 2026-07-22 (STORY-022 reconcile): /projects, /settings, and /projects/:id/settings are no longer routes -->

| Route | View | Description |
|-------|------|-------------|
| `/` | Redirect (or empty state) | → `/projects/:lastId/stories` if a project was previously visited or one exists; if no projects exist at all, stays at `/` showing an empty Task Manager main view with the Projects overlay auto-opened |
| `/projects/:id/stories` | Stories List | Stories within the active project |
| `/projects/:id/board` | Stories Board | Kanban of stories grouped by story status |
| `/projects/:id/milestones` | Milestones | Milestones within the active project |
| `/projects/:id/stories/:storyId` | Story Detail | Full-screen slide-over on top of the current project view |
| `/projects/:id/stories/:storyId/tasks/:taskId` | Task Detail | Modal on top of the Story Detail slide-over |
| `/milestones/:id` | Milestone Detail | Milestone metadata + stories + attachments (live, STORY-007) + comments (live, STORY-008) |
| `/sessions` | Sessions | Its own app mode, structurally separate from `/projects/:id/*`; own project-selector sidebar, project-scoped sessions list, and a nested Session Detail view for a selected session <!-- updated: 2026-07-30 (STORY-009 reconcile): supersedes the earlier "full-screen flat list, no sidebar" placeholder shape --> |
| `/comments/:id` | Comment permalink resolver | <!-- new: 2026-07-21 (STORY-008) --> Not a page of its own — resolves the comment's host view (Story slide-over, Task Detail modal, or Milestone Detail page) and navigates there with the comments section expanded and that comment scrolled into view and highlighted. If the comment has since been hard-deleted (no surviving container to resolve), shows a calm `role="status"` "This comment is no longer available." message with a link back home instead of navigating. |

Projects management and system Config have no route of their own — they are reached exclusively as overlay panels from the top-bar Projects/Config entries, from any main view. See Global Overlay above.

Navigation rules:
- Navigating to a resource that no longer exists (deleted) shows a "Not found" inline message with a link back to the parent level.
- Breadcrumbs are shown within the Story Detail slide-over header: e.g. `← Stories / Story Title`.
- The last visited project ID is persisted in browser local storage to power the `/` redirect.
- Opening or closing the Projects/Config overlay never changes the URL and never dismisses an open Story slide-over or Task Detail modal — the overlay layers on top of them instead (a behavior change from the pre-STORY-022 model, where Projects/Config were routes and navigating to them dismissed any open slide-over/modal as ordinary top-level navigation).

---

## Page Behaviours

### Projects Overlay — Project List <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

> **As-built notes (STORY-003):** Modals use native `<dialog>` elements. The Milestones section previously shown here is now at `/projects/:id/milestones`.
> **As-built notes (STORY-016):** Migrated from the homepage (`/`) to a dedicated full-screen management page (no sidebar, no sub-nav).
> **As-built notes (STORY-022):** No longer a page or route. This content is now the root level of the global Projects overlay — a slide-over panel opened from the top-bar Projects entry, available from any mode. The panel has no page heading or its own "Close" control of its own; the overlay frame (Back/Dismiss) owns closing. See Global Overlay above for the panel mechanics.

The root level of the Projects overlay. No sidebar, no sub-navigation. Reached exclusively via the global top-bar Projects entry.

- Lists all projects as a table: name, description (truncated), created_at, with per-row edit/delete action buttons (Lucide icons)
- **Create project** button → modal form: name (required, 1–200 chars), description (optional, max 5000 chars); saves on submit
- **Edit** button per project → same form pre-filled in a modal
- **Delete** button per project → confirmation dialog that explicitly names all nested data that will be permanently removed (stories, tasks, attachments, comments, settings overrides)
- Conflict error (409) surfaced as an inline message above the form submit button: API's `error` message verbatim
- Empty state shown when no projects exist (not an error)
- Clicking a project name pushes that project's **Settings** editor as the second level of the Projects overlay (Back returns to this list) — it does not navigate anywhere and does not land on the project's Stories view. This is a change from the pre-STORY-022 behavior, where clicking a project name navigated straight to its Stories view. <!-- updated: 2026-07-21/22 (STORY-022) -->
- This is the only overlay/page where a project's name click leads to Settings — the Task Manager sidebar's project combobox and project list continue to land on the project's Stories view when a project is selected, unaffected by this change

---

### Stories View (`/projects/:id/stories`) <!-- updated: 2026-07-10 (STORY-016 reconcile) -->

> **As-built notes (STORY-004):** Implemented at `/projects/:id` (old route).
> **As-built notes (STORY-016):** Migrated to `/projects/:id/stories` as the `Stories` sub-nav tab inside ProjectShell. The old route `/projects/:id` is no longer valid. The page heading (project name) and breadcrumb from the pre-shell design were removed; the sidebar and sub-nav provide that context. Each story title is a clickable button (`aria-label="Open story: …"`) that opens the Story Detail slide-over. `StoriesPage` persists the active project ID to `LAST_PROJECT_KEY` in local storage on mount, keeping RootRedirect in sync. The `stories` route is a layout route with a nested `:storyId` child route so the Stories list stays mounted behind the slide-over.

Sub-nav active tab: **Stories**.

- Lists stories as a table: title, status (badge), labels (tag chips), task aggregate (e.g. "3/5 done")
- **Filter bar** above the list: status dropdown (populated from project's effective `story_statuses`), label key text input + label value text input
- **Create story** button → form panel: title (required), content (Markdown textarea, optional), status (dropdown, optional), labels editor, milestone dropdown (optional; populated from project's milestones)
- **Edit** button per story row → same form pre-filled
- **Delete** button per story row → confirmation dialog
- Clicking a story title opens the Story Detail slide-over; URL updates to `/projects/:id/stories/:storyId`
- Task aggregate ("3/5 done") is fetched from `GET /stories/:id/aggregate` per visible story row (one independent TanStack Query instance per row); "—" (em-dash) shown when `total_tasks === 0` or while loading; updates live after every task create, update, or delete without a page refresh <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

---

### Board View (`/projects/:id/board`) <!-- updated: 2026-07-11 (STORY-017 reconcile) -->

Sub-nav active tab: **Board**.

> **As-built notes (STORY-016):** The Board fetches up to 100 stories (the API page limit); projects with more than 100 stories will silently show only the first 100 — a known gap to be addressed in a future story.
>
> **As-built notes (STORY-012):** Active-milestone filtering implemented. The Board tab is always enabled regardless of whether an active milestone exists. Per-column "Add story" with active milestone pre-assigned is not implemented (deferred to a future story).
>
> **As-built notes (STORY-017):** The binary banner+toggle is replaced by a `<select>` combobox in the board header. The hook contract changed from `showingAll`/`handleShowAll`/`activeMilestone` to `selectedMilestoneId`/`milestones`/`handleSelectMilestone`. The "filtered+empty" early-return guard was removed; the board renders the combobox in the standard header at all times after load.

- One column per effective `story_statuses` dictionary value for the project; columns are derived from the project's effective settings (never hardcoded). Column droppable IDs use the prefix convention `col-<status>` to distinguish them from card IDs (plain story UUIDs).
- Each column header shows the status name and a count of story cards in that column
- Each story card displays: title, labels (tag chips), task aggregate badge
- Cards within a column are ordered by `created_at` ASC
- **Drag-and-drop (dnd-kit):** dragging a card to another column fires an optimistic `PUT /v1/stories/:id` status update (snapshot-and-restore pattern); card snaps back on API failure. A card dropped on a status no longer present in the effective dictionary shows an inline error on the card. The drag logic is isolated in the `useBoardDrag` hook.
- Clicking a story card title opens the Story Detail slide-over; URL updates to `/projects/:id/stories/:storyId`
- Board canvas is horizontally scrollable; all columns remain accessible regardless of sidebar collapsed state
- Stories with `status: null` or a status not present in any active column are silently excluded from the board

**Milestone filter combobox:**
- A `<select>` combobox is displayed in the board header area. It lists all project milestones with a status hint in parentheses: e.g. `"Sprint 1 (Active)"`, `"Sprint 2 (Planned)"`, `"Sprint 3 (Finished)"`. An "All stories" option always appears at the top of the list.
- On mount and on project navigation change, the combobox defaults to the active milestone if one exists; otherwise defaults to "All stories".
- Changing the combobox selection immediately re-filters the board to show only stories assigned to the selected milestone, or all stories when "All stories" is selected.
- The combobox is not rendered while milestones are still loading.
- When the project has no milestones, the combobox renders with only the "All stories" option visible.
- All combobox interactions are keyboard-accessible via the native `<select>` element.

---

### Story Detail slide-over (`/projects/:id/stories/:storyId`) <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

> **As-built notes (STORY-016):** The slide-over is implemented as a nested child route of `/projects/:id/stories`. The slide-in animation uses a custom `slide-in-from-right` keyframe defined in `tailwind.config.ts` (no `tailwindcss-animate` dependency). Story description is rendered via `react-markdown` using Tailwind arbitrary-property selectors (no `@tailwindcss/typography` dependency). Attachments and comments sections inside the right panel are static placeholders pending STORY-007 and STORY-008. The right panel persists open/closed state per story in browser local storage keyed by story ID via the shared `useLocalStorage` hook.
>
> **As-built notes (STORY-005):** The task kanban placeholder (`TaskKanbanPlaceholder`) has been replaced with a fully functional, dictionary-driven `TaskKanban` component. The slide-over now renders an `<Outlet />` at the bottom of its fragment so the nested `tasks/:taskId` child route can mount the Task Detail modal on top without unmounting the slide-over. `TaskKanbanPlaceholder` in `src/features/stories/components/TaskKanbanPlaceholder.tsx` is now dead code — it will be deleted once QA confirms no test references it.
>
> **As-built notes (STORY-012):** A Milestone section has been added to the right panel between Description and Attachments. It shows the story's current milestone assignment and provides an inline control (native `<select>`) to set or clear it. The mutation calls `PUT /stories/:id` with only `milestone_id` set. Milestone options show `(Active)` or `(Finished)` suffixes for non-planned milestones; planned milestones have no suffix. A status hint below the select indicates the active milestone in an accent color. Errors from a failed milestone update surface via the shared mutation error banner in the slide-over.

**Opening:** clicking a story title (from Stories list or Board) triggers a slide-over panel that animates in from the right, covering the sidebar and sub-navigation. The background content is dimmed but not unmounted. The URL updates for deep-linking. Navigating directly to the story URL renders the project view with the slide-over already open.

**Closing:** the `✕` button or `Escape` key closes the slide-over and restores the previous URL (Stories list or Board). The `← Stories` breadcrumb in the slide-over header also closes it and navigates to the Stories list.

**Layout:** two-column inside the slide-over. The main area (left) contains the story header and the task kanban. A collapsible right panel contains the story description (rendered Markdown), story milestone assignment, story links, story-level attachments, and story-level comments. A toggle button (`‹`/`›` chevron anchored to the panel edge) expands or collapses it. The panel's open/closed state is persisted in browser local storage per story.

```
┌──────────────────────────────────────────┬─────────────────────┐
│  ← Stories / Story Title      ✏  [✕]    │ ›  Right panel      │
│  ─────────────────────────────────────   │                     │
│  Task kanban                             │  Description        │
│                                          │  ──────────────     │
│                                          │  Milestone          │
│                                          │  ──────────────     │
│                                          │  Links              │
│                                          │  ──────────────     │
│                                          │  Attachments        │
│                                          │  ──────────────     │
│                                          │  Comments           │
└──────────────────────────────────────────┴─────────────────────┘
                                             ↑ collapsible
```

**Story header (always visible):**
- Displays title, status badge, labels
- **Edit story** button → form panel

**Task kanban — main area:** <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

- One column per status value in the project's effective `task_statuses` dictionary, ordered as defined in the dictionary
- Each column header shows the status name and a count of cards in that column
- Each task card displays: title, type badge, assignee_role (if set), label chips
- Cards within a column are ordered by `created_at` ASC
- **Drag-and-drop:** dragging a card to another column updates the task's `status` via `PUT /tasks/:id`; optimistic update — card snaps back and an error toast is shown on API failure
- **Filter bar** above the board: type, assignee_role, creator_role — all dropdowns populated from project's effective settings; active filters dim non-matching cards without removing columns
- **Add task** button at the bottom of each column → form panel with that column's status pre-filled (read-only in this context)
- Clicking a task card title opens the Task Detail modal; URL updates to `/projects/:id/stories/:storyId/tasks/:taskId`
- **Edit** and **Delete** via card context menu (⋯ icon on hover)

**Right panel — Story Description:**
- Renders story content as Markdown (truncated with "Show more" if long)

**Right panel — Story Milestone:** <!-- updated: 2026-07-11 (STORY-012) -->
- Displays the story's current milestone assignment (milestone name, or "None")
- Native `<select>` control populated with all milestones belonging to the story's project: "None" option first, then each milestone with its status suffix (`(Active)`, `(Finished)`, or no suffix for `Planned`)
- Selecting an option immediately calls `PUT /stories/:id` with only `{ "milestone_id": <value_or_null> }` — no other story field is changed
- A status hint below the select shows the selected milestone's status (accent color for `Active`, muted for `Planned`/`Finished`)
- The control is populated from `GET /milestones?project_id=<projectId>` scoped to the story's project
- Only milestones belonging to the story's project are eligible — milestones from other projects are never shown

**Right panel — Story Links:** <!-- added: 2026-07-12 (STORY-006); updated: 2026-07-13 (STORY-018, STORY-019, STORY-020) -->

> **As-built (STORY-005/016):** Static placeholder section (no link endpoint calls). Live implementation delivered by STORY-006.
>
> **As-built (STORY-018):** The `link_type` badge in each row shows a human-readable, direction-aware label via `getLinkLabel(linkType, direction)`. Known mappings: `depends-on` outbound → "depends on", inbound → "dependent"; `created-by` outbound → "created by", inbound → "creates"; `context` outbound → "context", inbound → "context for". Unknown types fall back to the raw `link_type` string.
>
> **As-built (STORY-019):** The Add link form dropdown shows all directional label options via `getLinkOptions(linkTypes)`, which expands each key into two entries (outbound + inbound). When the user selects an inbound option, the API call swaps source and target so direction semantics are preserved on the backend (`useCreateStoryLink` accepts optional `sourceStoryId` to override the source). An empty `linkTypes` dictionary shows a "No link types configured" placeholder.
>
> **As-built (STORY-020):** `getLinkLabel` and `getLinkOptions` now accept `LinkTypeEntry[]` from the API (not a string array and not a hardcoded map). Labels are sourced exclusively from the `outbound` / `inbound` fields of the resolved dictionary entries. Unknown `link_type` values (type deleted after link was created) fall back to the raw value string — no crash.

- Heading "Links" with a count badge
- Single list showing both outbound and inbound story links; each row displays: direction indicator (→ / ←), `link_type` badge (rendered as direction-aware human-readable label), linked story title
- The linked story title is a clickable link: clicking navigates to that story's Story slide-over (URL updates to `/projects/:id/stories/:linkedStoryId`)
- **Add link** button → inline form: search-by-title input for target story (within the same project), `link_type` dropdown showing all directional label options (outbound + inbound for each key) populated from project's effective `link_types`; selecting an inbound option swaps source and target before the API call
- **Delete** button per link row → confirmation dialog; on confirm the link is removed and the list refreshes

**Right panel — Story Attachments:** <!-- updated: 2026-07-15 (STORY-021: title replaces type) -->

> **As-built (STORY-016):** Static placeholder section. No attachment endpoint calls. Live implementation delivered by STORY-007.
>
> **BUG-001 fix (2026-07-15):** the section heading was initially missing the count badge present on the Task and Milestone hosts; fixed uniformly across all three hosts since they share one component. See the note below.
>
> **As-built notes (STORY-021):** the list row's `type` badge is replaced by the attachment's `title`.
> For `external-ref` kind, the `external_url` continues to be shown alongside the title (title is the
> primary label; the URL is secondary/supporting text). Confirmed matching the shipped UI — QA passed
> with zero bugs.

- Heading "Attachments" with a count badge reflecting the number of attachments currently listed; updates live after every create/delete
- Lists attachments: title, kind badge, file_size_bytes, created_at (external-ref rows also show `external_url`)
- **Add attachment** button → attachment upload panel (see Attachment Upload Panel below)
- **View** button → opens the in-app Attachment Viewer (see Attachment Viewer below) for document/image/file kinds; opens `external_url` in a new tab for external-ref
- **Delete** button (every kind) → confirmation dialog; permanent, no archive step

**Right panel — Story Comments:** <!-- updated: 2026-07-21 (STORY-008 reconcile) -->

> **As-built (STORY-016):** Static placeholder section. No comments endpoint calls. Live implementation delivered by STORY-008.
>
> **As-built (STORY-008):** identical behavior on all three hosts (Story slide-over, Task Detail modal, Milestone Detail page) — see the shared **Comments Section** description below.

See **Comments Section (shared)** below Milestone Detail View for the full field-level and interaction spec: heading with live count badge, thread rendered newest-first, per-comment Edit/Reply/Delete/Copy-link actions, Add Comment form pinned at the top, `@role` mention autocomplete, and permalink deep-linking.

---

### Task Detail View (`/projects/:id/stories/:storyId/tasks/:taskId`) <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

> **As-built notes (STORY-005):** The Task Detail modal is a full-screen modal (z-index 60/70) rendered above the slide-over (z-50). Data is fetched from `GET /tasks/:id/detail` via `useTaskDetail`. Effective settings (`task_types`, `task_statuses`, `participant_roles`) are loaded via `useProjectSettingsEffective(projectId)` — the data is already in the TanStack Query cache from StorySlideOver, so no extra network request is made at runtime. The Escape key is registered in the **capture phase** to intercept it before the slide-over's bubble-phase listener, preventing the slide-over from closing when the user dismisses the modal. The modal backdrop has no `onClick` handler — clicking the dimmed slide-over behind the modal does not close it. The inline Edit toggle replaces the metadata block with `TaskForm`; saving returns to the metadata view without a full remount. At STORY-005 time, Links, Attachments, and Comments sections were static placeholders pending STORY-006, STORY-007, and STORY-008 respectively — Links went live in STORY-006, Attachments in STORY-007, and Comments in STORY-008.

**Layout:** full-screen modal overlay on top of the Story Detail slide-over. The slide-over behind it is dimmed but not unmounted. The modal has a fixed header (task title + close button) and a single vertically scrollable body containing all sections.

Opening: clicking a task card on the task kanban opens the modal and updates the URL. Navigating directly to the task URL renders the project view with the Story Detail slide-over open and the Task Detail modal on top.

Closing: the `✕` button or `Escape` key closes the modal and restores the URL to the story route (slide-over remains open).

Data is fetched from `GET /tasks/:id/detail` (single call — task + links + attachments + comments).

```
┌──────────────────────────────────────────────┐
│  Task title                             [✕]  │  ← fixed header
├──────────────────────────────────────────────┤
│                                              │
│  Task metadata                               │  ↑
│  (type, status, assignee, creator, labels,   │  │
│   content)                                   │  │
│                                              │  │
│  ── Links ────────────────────────────────   │  │  scrollable
│  (outbound + inbound table)                  │  │  body
│                                              │  │
│  ── Attachments ──────────────────────────   │  │
│  (list + add)                                │  │
│                                              │  │
│  ── Comments ─────────────────────────────   │  │
│  (thread + add comment form)                 │  ↓
└──────────────────────────────────────────────┘
```

**Task metadata (top of scroll):**
- Displays: title, type badge, status badge, assignee_role, creator_role, labels, rendered Markdown content
- **Edit task** button → inline edit form replacing the metadata block (not a separate panel)

**Links section:** <!-- updated: 2026-07-13 (STORY-006, STORY-018, STORY-019, STORY-020) -->

> **As-built (STORY-005):** Static placeholder section (no link endpoint calls). Live implementation delivered by STORY-006.
>
> **As-built (STORY-018):** The `link_type` badge uses `getLinkLabel(linkType, direction)` for direction-aware human-readable labels. `direction` is optional on `EnrichedTaskLink`; when absent the raw `link_type` string is used as fallback.
>
> **As-built (STORY-019):** The Add link form dropdown uses `getLinkOptions(linkTypes)` to show all directional options (outbound + inbound per key). Inbound selections trigger source/target swap in `useCreateTaskLink` (optional `sourceTaskId` parameter) before the API call.
>
> **As-built (STORY-020):** `getLinkLabel` and `getLinkOptions` accept `LinkTypeEntry[]` (not a string array). Labels are sourced from `entry.outbound` / `entry.inbound`; no hardcoded fallback map remains. Unknown `link_type` values fall back to the raw value string.

- Heading "Links" with count badge
- Single list showing both outbound and inbound task links; each row: direction indicator (→ / ←), `link_type` badge (direction-aware human-readable label), linked task title, linked task status badge
- The linked task title is a clickable link: clicking navigates to that task's Task Detail Modal (URL updates to `/projects/:id/stories/:storyId/tasks/:linkedTaskId`)
- **Add link** button → inline form below the list: search-by-title input for target task (scoped to the same story), `link_type` dropdown showing all directional label options (outbound + inbound for each key) populated from project's effective `link_types`; selecting an inbound option swaps source and target before the API call
- **Delete** button per link row → confirmation dialog

**Attachments section:**
- Heading "Attachments" with count badge
- Same behaviour as Story Attachments (list, add, view, delete) — see Story Detail above

**Comments section:** <!-- updated: 2026-07-21 (STORY-008 reconcile) -->
See **Comments Section (shared)** below Milestone Detail View for the full spec.

---

### Milestones View (`/projects/:id/milestones`)

Sub-nav active tab: **Milestones**.

**Milestone statuses:** each milestone has one of three statuses: `Planned`, `Active`, `Finished`. Only **one milestone per project** may have status `Active` at any time. The active milestone is the Board's default story filter.

- Lists milestones as a table: name, status badge (`Planned` / `Active` / `Finished`), story count, description (truncated)
- The active milestone row is visually highlighted (e.g. bold name or accent border)
- Empty state shown when no milestones exist for the project, with a prompt to create one
- **Create milestone** button → form panel: name (required), description (optional); status defaults to `Planned`
- **Edit** button per milestone → same form pre-filled (name and description only)
- **Activate** button per `Planned` or `Finished` milestone → sets its status to `Active`; if another milestone is currently `Active`, a confirmation dialog warns: "This will deactivate '{current active name}'. Continue?" — on confirm, the previous active milestone is set to `Planned` and the new one becomes `Active`
- **Finish** button per `Active` milestone → sets its status to `Finished`; the Board reverts to showing all stories unfiltered
- **Delete** button per milestone → confirmation dialog: "Delete milestone '{name}'? Stories assigned to it will lose their milestone association."
- Clicking a milestone name navigates to `/milestones/:id`

---

### Milestone Detail View (`/milestones/:id`) <!-- updated: 2026-07-14 (STORY-007 spec) -->

- Displays: name, description, status badge, story count
- **Edit milestone** button → form panel (name and description only)
- **Stories** section: paginated list of assigned stories; each row shows title, status badge; clicking a title opens the Story Detail slide-over

**Attachments section:**
- Heading "Attachments" with a count badge
- Same behaviour as Story Attachments (list, add, view, delete) — see Story Detail slide-over above

**Comments section:** <!-- updated: 2026-07-21 (STORY-008 reconcile): live implementation, replacing the "Deferred to STORY-008" placeholder -->
See **Comments Section** immediately below for the full spec, shared identically with the Story slide-over and Task Detail modal.

---

### Comments Section (shared — Story slide-over, Task Detail modal, Milestone Detail page) <!-- new: 2026-07-21 (STORY-008 reconcile) -->

Identical behavior on all three hosts.

- Section heading "Comments" with a live count badge, matching the Attachments section convention; the badge updates live after every create/delete
- Thread rendered **newest-first**: each entry shows the author role, the comment content rendered as Markdown, its label chips, a timestamp, and — for a reply — a "↩ Replying to {author_role}" line above the content, derived from the comment's stored ancestor lineage
- Each comment has inline **Edit**, **Reply**, **Delete**, and **Copy link** icon actions (Lucide, per the icon library standard); **Delete** uses the standard destructive-action confirmation dialog and a visually distinct danger color
- **Edit** switches that comment's entry into an inline form for `content` and `labels` only — `author_role` is displayed as read-only text in edit mode, since it cannot be changed
- **Add Comment** form is pinned at the **top** of the section, above the thread:
  - `author_role` text input, pre-filled with the project's effective default Web UI role (resolved the same way effective dictionary values are shown elsewhere); the user can freely edit or clear this value before submitting — it is a plain free-form text field, not a dropdown, consistent with the rule that a comment's own author role is never dictionary-validated
  - `content` Markdown textarea, required — supports `@role` mention autocomplete (see below)
  - Labels editor (reuses the existing key/value labels editor pattern)
  - Submit is disabled while `content` or `author_role` is empty; inline errors appear below each field on a failed attempt
  - On success, the new comment appears at the **top** of the thread and the form resets — `content` and `labels` clear, `author_role` resets to the effective default Web UI role again (not to whatever the user last typed)

**Replying to a comment:**
- **Reply** on any comment marks it as the target and scrolls the Add Comment form into view, showing a dismissible "↩ Replying to {author_role}'s comment" chip above the `content` field; `content` itself starts empty for the author's own words
- The author can dismiss the chip before submitting to drop the reply relationship and post an ordinary, unrelated comment instead
- `author_role` still pre-fills from the effective default Web UI role exactly as it does for any new comment; labels behave identically too
- Submitting posts an ordinary new comment at the top of the (flat, newest-first) thread, carrying its lineage back to the target — there is no visual nesting, indentation, or thread structure beyond the "↩ Replying to {author_role}" line the rendered comment shows
- That line is clickable and resolves via the comment-permalink mechanism below; if its target has since been hard-deleted, the line simply renders as plain, unlinked text (the host work item is already known from the surrounding thread, so no "no longer available" fallback is needed here)

**Comment permalinks:**
- **Copy link** on any comment copies a direct URL to the clipboard and shows a brief confirmation (e.g. a toast reading "Link copied"), consistent with the app's existing toast notification pattern
- Opening that URL (in the same browser or a different one) navigates to `/comments/:id` (see Route Table), which resolves to that comment's host view — the Story slide-over, Task Detail modal, or Milestone Detail page, whichever owns it — with the comments section already expanded and that specific comment scrolled into view and briefly highlighted (e.g. a momentary accent background that fades)
- Because comments have no archive or tombstone, a permalink to a comment that has since been hard-deleted has no surviving host to resolve to; opening it instead shows a calm, non-error `role="status"` message ("This comment is no longer available.") with a link back home, rather than crashing or looking like a broken page

**`@role` mentions in comment content:**
- While typing in the `content` field of the Add Comment form, or while editing an existing comment's content, typing `@` opens an inline autocomplete combobox listing the project's effective `participant_roles` values; the list narrows live as the user keeps typing after `@`
- Selecting an entry from the combobox inserts `@<role-value>` at the cursor position; the combobox then closes. The user may also dismiss it and keep typing free text — nothing is enforced
- The combobox never performs any action beyond inserting text — no notification is sent, nothing is linked, no other part of the utility is aware a mention exists
- When a comment's content is rendered (in the thread, on any of the three hosts), any `@<value>` token that exactly matches a role currently in the project's effective `participant_roles` list is shown with a distinct highlight (an accent-colored inline badge) inside the rendered Markdown; a token that does not match any current role renders as plain text, identical to the rest of the content
- This applies only to Comment content — Story and Task content fields are unaffected by this story
- **Accessibility:** this is the app's first non-native dropdown (every other picker in the app is a native `<select>`, keyboard-accessible by default) and is built to the same WCAG 2.1 AA bar explicitly: it follows the ARIA combobox/listbox pattern, is fully operable from the keyboard (arrow keys to move through matches, `Enter` to select the highlighted match, `Escape` to dismiss the combobox without inserting anything and return focus to the textarea at the same cursor position), and never traps focus outside the textarea

---

### Sessions View (`/sessions`) <!-- updated: 2026-07-30 (STORY-009 reconcile): full build; supersedes the STORY-022-era "full-screen flat list, no sidebar" placeholder shape below -->

Sessions is its own top-level app-switcher mode (alongside Task Manager), mirroring Task Manager's overall structure rather than rendering as a single flat page: it has its own project-selector sidebar (see Left sidebar — Sessions mode above) and a nested Session Detail view scoped to the currently selected project. There is no cross-project Sessions view anywhere — consistent with the mandatory `project_id` scope on the Session entity, every session read is scoped to one selected project. The app switcher in the top bar shows `Sessions`. The Projects and Config top-bar entries remain visible and open-able here, identically to Task Manager mode.

**Sessions list**, scoped to the active project:
- Lists sessions as a table: topic, participant_role, linked story (clickable, shown separately) and linked task (clickable, shown separately), created_at, and a status indicator (`pending` / `in-progress` / `finished`) driven directly by `status`
- **Incomplete only** toggle filter (`status` is `pending` or `in-progress`) and a filter by linked story — independently combinable (calls `GET /sessions?project_id=…&incomplete=true&linked_story_id=…`)
- Pagination
- Empty state ("No sessions yet") shown when the active project has no sessions — not an error
- Clicking a session row opens the Session Detail view

**Create session** — a form panel capturing:
- `topic` (text, required)
- `goal` (text, required — the purpose the session was created for)
- `context` (textarea, optional)
- `participant_role` (dropdown, required — populated from the project's effective `participant_roles`, not free text)
- Two independent optional link fields — a story link and a task link, each selectable (search input) from stories/tasks within the active project; either, both, or neither may be set
- `project_id` is implicit (the active project) — never a field the user fills in directly
- There is no `status` input on this form; every session starts at `status: pending`

**Session Detail view** — a dedicated view opened by selecting a session from the list, showing the full session record: topic, goal, context, status, participant_role, linked story, linked task, result_decisions, result_summary, created_at, updated_at. From here every updatable field can be edited:
- `topic` — cannot be cleared, only changed to a new non-empty value
- `goal` — cannot be cleared, only changed to a new non-empty value
- `context` — freely editable or cleared
- `participant_role` — re-selected from the dictionary dropdown; cannot be cleared, only changed to another valid value
- linked story, linked task — each independently settable/clearable
- `result_decisions`, `result_summary` — freely editable or cleared, independently of `status` and of each other
- **Status control** offering all three fixed values (`pending` / `in-progress` / `finished`), settable to any of the three at any time, in any direction — no transition restriction
- **Archive** action, also available as a row action from the Sessions list

**Navigation:** clicking the linked story, or the linked task, inside the Session Detail view navigates to that item's own detail view in Task Manager mode (Story slide-over or Task Detail modal), consistent with the cross-linking conventions used elsewhere in the app.

---

### System Settings View — Config Overlay <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

> **As-built notes (STORY-002):** Previously implemented as two tabs (`System Defaults` / `Project Overrides`) at `/settings`. The Project Overrides tab is removed from this view — project overrides now live in the Projects overlay's Settings level.
>
> **As-built notes (STORY-020):** `link_types` uses a dedicated three-field `LinkTypesEditor` component instead of the generic `DictionaryEditor`. The `LinkTypesEditor` spans both grid columns (`sm:col-span-2`). The generic `DictionaryEditor` is unchanged.
>
> **As-built notes (STORY-021):** the `attachment_types` editor is removed — the dictionary key no
> longer exists (its sole consumer, the Attachment `type` field, was replaced by a free-form `title`).
>
> **As-built notes (STORY-008):** a sixth row, "Default Web UI role", is added alongside the five
> dictionary rows — named and described generically (not "comment author"), since Comments is only
> its first consumer. Unlike the other five keys, it renders as a **single-value dropdown** populated
> from the effective `participant_roles` list, since it holds exactly one value, not a set. The
> dropdown is pre-selected to the current system value (`"operator"` out of the box); Save updates
> the system-wide default. Selecting a value not currently present in the effective `participant_roles`
> list is prevented client-side (the dropdown only ever offers current, valid values) and rejected
> server-side if attempted another way. For now, this row's only observable effect anywhere in the
> product is pre-filling the Add Comment form's `author_role` field.
>
> **As-built notes (STORY-022):** No longer a page or route (`/settings` no longer exists). This content is the single level of the global Config overlay — a slide-over panel opened from the top-bar Config entry, available from any mode (Task Manager or Sessions), not gated to Task Manager as it was before this story. It has no page heading or its own close control — the overlay frame (Dismiss; no Back, since Config is a single level) owns closing.

Reached exclusively via the global Config entry in the top bar, visible and open-able from both Task Manager and Sessions modes. No sidebar; no sub-navigation bar; no Back control (single-level overlay).

- Six settings rows in a 2-column responsive grid (not accordion): five dictionary keys (`task_statuses`, `task_types`, `story_statuses`, `link_types`, `participant_roles`) plus the scalar `default_web_ui_role`
- Four dictionary keys (`task_statuses`, `task_types`, `story_statuses`, `participant_roles`) use the generic chip-list editor: shows current values as an editable chip list (add value via text input + Enter/Add button; remove individual chips)
- `link_types` uses the **three-field `LinkTypesEditor`**: renders one row per entry with three editable fields — **Value**, **Outbound label**, **Inbound label**; **Add entry** appends a blank row; **Remove** per row; all three fields must be non-empty before Save is enabled (client-side guard); server 422 surfaces above the Save button
- `default_web_ui_role` uses a **single-value dropdown** populated from the effective `participant_roles` list — Save disabled while no value is selected
- **Save / Cancel** controls per editor — Save disabled when the value list is empty, any `link_types` field is blank, or (for `default_web_ui_role`) no value is selected
- Per-key independent save state and error state (saving one key does not affect others)
- **Save** calls `PUT /v1/system/settings` with only the changed key (partial body)
- Server errors (400: unknown key, empty values, duplicate `link_types` value; 422: blank `link_types` field, or `default_web_ui_role` not in the effective `participant_roles`) surfaced inline below/above the relevant editor

---

### Project Settings View — Projects Overlay, Settings Level <!-- updated: 2026-07-22 (STORY-022 reconcile) -->

> **As-built notes (STORY-002):** Previously implemented as the "Project Overrides" tab within `/settings`.
>
> **As-built notes (STORY-020):** `link_types` uses the same three-field `LinkTypesEditor` as the System Settings page. The Override badge and Clear override action for `link_types` are sourced from the stored overrides, same as all other keys.
>
> **As-built notes (STORY-021):** the `attachment_types` row is removed along with the retired
> dictionary key.
>
> **As-built notes (STORY-008):** a sixth row, "Default Web UI role", is added — same single-value
> dropdown as the System Settings page, populated from the effective `participant_roles` list. It
> shows the current project override (if set) with an `Override` badge, or the inherited system value
> otherwise, and uses the same **Override/Edit** and **Clear override** controls as the other five keys
> (inheriting the same known backend gap described below — this story does not close it).
>
> **As-built notes (STORY-022):** No longer its own route or a per-project sub-navigation tab (`/projects/:id/settings` no longer exists as a route, and Settings left the project sub-nav's tab set — see Layout Shell). Reached exclusively by choosing a project from the Projects overlay's project list, rendering as the second level of that overlay. Preserves the pre-existing project-not-found / load-error handling for an unresolved project id. **Back** (overlay frame) returns to the project list; **Dismiss** clears the whole overlay. An **"Open in Task Manager"** action, next to the project-name heading, navigates the main view to this project's Stories and dismisses the overlay in the same step — the successor to the story's earlier, superseded standalone-screen "View Stories" patch, and the resolution for BUG-006 (no in-app path from Settings to a project's own Stories/Board/Milestones for a project not yet opened in Task Manager mode this session). No sub-navigation tab bar is added to this panel.

Reached by selecting a project from the Projects overlay's project list (see Projects Overlay — Project List above). Not a sub-nav tab; the project sub-navigation seen once inside a project via the sidebar has exactly three tabs (Stories, Board, Milestones).

- Lists all six settings keys with their effective values: five dictionaries plus the scalar `default_web_ui_role`
- Four plain-string keys use the generic chip-list editor
- `link_types` uses the **three-field `LinkTypesEditor`** (same behaviour as System Settings — three-column rows, Add/Remove, client-side guard before Save)
- `default_web_ui_role` uses the same **single-value dropdown** as the System Settings page, populated from the effective `participant_roles` list
- Each key row shows: key name, current override value (if set) with an `Override` badge, or the inherited system default value
- **Override / Edit button** per key → activates inline editor for that key
- **Clear override** button (visible when override is set) → intended to revert to system default; calls `DELETE /v1/projects/:projectId/settings/:key` — **this endpoint does not exist on the backend as of STORY-002; the action fails at runtime** (see Known Gaps in backend requirements). `default_web_ui_role`'s Clear override control is wired identically and fails the same way.
- **Save** button per key → calls `PUT /v1/projects/:id/settings` with only the changed key
- Effective values always visible via `GET /v1/projects/:id/settings/effective`
- **Open in Task Manager** button → navigates to `/projects/:id/stories` and dismisses the overlay in the same action, landing on that project's Stories with the three-tab sub-navigation (Stories/Board/Milestones) available; works for any project regardless of whether it was previously opened in Task Manager this session

---

## Form Behaviours

### Story Form <!-- updated: 2026-07-11 (STORY-012) -->
Fields: title (text, required), content (Markdown textarea, optional), status (dropdown, optional), labels editor, milestone (dropdown, optional).

The milestone dropdown is populated from `GET /milestones?project_id=<projectId>` scoped to the current project. Options include "None" (to clear the assignment) followed by each milestone name with its status suffix (`(Active)`, `(Finished)`, or no suffix for `Planned`). The pre-filled value for Edit is the story's current `milestone_id`.

### Task Form
Fields: title (text, required), content (Markdown textarea, optional), type (dropdown, required), status (dropdown, required), assignee_role (dropdown, optional), creator_role (dropdown, optional), labels editor.

All dropdown options populated from `GET /projects/:id/settings/effective` for the current project.

### Attachment Upload Panel <!-- updated: 2026-07-15 (STORY-021: type dropdown replaced by title field) -->

> **As-built notes (STORY-021):** The `Type dropdown` (previously populated from the project's
> `attachment_types` dictionary) is removed. A `Title` text input takes its place: mandatory on every
> kind. When the user selects a file for the `document` (Upload file mode), `image`, or `file` kind,
> the Title field auto-populates with the selected file's name (truncated to 500 chars if longer); the
> user can edit it before submitting, and the edited value is what gets saved. For the `document`
> kind's "Write Markdown" mode and for the `external-ref` kind, the Title field has no default and the
> user must type it in. Built exactly as planned; confirmed by manual QA with zero bugs filed.

- **Kind selector:** document / image / file / external-ref (radio or segmented control)
- **Title text input (required):** auto-populated from the selected file's name when a file is chosen
  (document-as-file, image, file kinds); editable before submit; empty for document-as-text and
  external-ref, which require the user to type a title explicitly
- **For document kind:**
  - Mode toggle: "Write Markdown" (textarea) vs "Upload file" (file picker accepting .md, .txt)
  - MIME type auto-detected from mode: `text/markdown` (textarea) or from file extension
- **For image kind:**
  - File picker accepting image/png, image/jpeg, image/gif, image/webp
  - Client-side size check: reject before upload if file > 10 MB with inline error
- **For file kind:**
  - File picker accepting the curated binary allow-list: PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP
  - Client-side size check: reject before upload if file > 10 MB with inline error
- **For external-ref kind:**
  - URL text input (required)
  - External status text input (optional)
- Author role text input (optional, free-form; stored immutably once set)
- Submit button; disabled while the title is empty
- Attachments are immutable once created — this panel has no edit mode; to change content or title, delete the attachment and create a new one

### Attachment Viewer <!-- updated: 2026-07-15 (STORY-007 reconcile) -->
Opened by the **View** action on an attachment row. Rendering is chosen by `mime_type`; content is
always fetched from `GET /attachments/:id/file`:

- **document, `text/markdown`** → rendered as formatted Markdown, reusing the app's existing Markdown renderer
- **document, `text/plain` / `text/csv` / `application/json`** → shown as raw text in a scrollable `<pre>` block
- **image** (PNG/JPEG/GIF/WEBP) → lightbox with `<img>`
- **file, `application/pdf`** → embedded via `<iframe>` (browser's native PDF viewer)
- **file, DOCX / XLSX / PPTX / ZIP** → no inline rendering; the row action is a **download** link only, not a viewer
- **external-ref** → has no stored file; the row action opens `external_url` in a new tab

On open, keyboard focus moves into the viewer modal (onto its close control); while open, Tab/Shift+Tab
cycle only among the modal's own focusable elements. `Escape` closes **only** the viewer — regardless of
which host it was opened from (Story slide-over, Task Detail modal, or Milestone Detail page) — leaving
any parent modal/slide-over open, and returns keyboard focus to the row's **View** button that opened it.
<!-- BUG-002/003/004 fix (2026-07-15): the viewer originally left focus on the triggering button on open (no trap), and Escape originally cascaded closed the parent Story slide-over or Task Detail modal along with the viewer. See the stacked-modal Escape rule under Accessibility. -->

### Labels Editor
- Displayed as a list of key-value pair rows
- Each row has: key text input, value text input, remove (×) button
- "Add label" button appends a new empty row
- On save, empty rows (both key and value blank) are silently discarded
- An empty key with a non-empty value returns a 400 from the API; error displayed inline

---

## Validation & Error Handling

| Scenario | UI Behaviour |
|----------|-------------|
| Required field missing on submit | Inline error below the field before API call is made |
| API 400 / 422 — field-level errors | Each `details[].field` maps to the corresponding form input; error shown below that input |
| API 409 — conflict (e.g. duplicate project name) | Error banner at top of form: the API's `error` message verbatim |
| API 404 — navigated resource deleted | "Not found" inline message with back-navigation link |
| API 500 — server error | Toast notification: "An unexpected error occurred. Please try again." |
| Network unreachable | Toast notification: "Cannot connect to the server. Make sure the utility is running." |
| File > 10 MB selected for image or file upload | Inline error below file input before upload is attempted: "File must be smaller than 10 MB." |
| Attachment title left empty on submit | Inline error below the Title field before API call is made: "A title is required for every attachment." <!-- new: 2026-07-15 (STORY-021) --> |
| Comment content or author_role left empty on submit | Inline error below the relevant field before the API call is made; Submit stays disabled while either is empty <!-- new: 2026-07-21 (STORY-008) --> |
| Comment permalink whose target has been hard-deleted | Calm, non-error `role="status"` message ("This comment is no longer available.") with a link back home, instead of a navigation or a crash <!-- new: 2026-07-21 (STORY-008) --> |
| Default Web UI role set to a value outside the effective `participant_roles` | Prevented client-side (dropdown only offers current valid values); a server-side 422 would surface as an inline error above the dropdown <!-- new: 2026-07-21 (STORY-008) --> |
| Confirmation dialog — user cancels | Dialog closes; no action taken |
| Activating a milestone when one is already active | Confirmation dialog: "This will deactivate '{current active name}'. Continue?" — cancel keeps current state; confirm swaps active milestone |
| Board tab accessed with no active milestone | Board shows all stories without any filter applied; no filter indicator is visible; the Board tab is always enabled |

---

## Non-Functional Requirements

### Performance
- Initial page load (Task Manager main view, or the empty-project state): < 2 s (accessed via Docker localhost port mapping) <!-- updated: 2026-07-22 (STORY-022 reconcile): the projects list is now an overlay, not the initial landing view -->
- Navigation between views (client-side routing): < 300 ms
- Story Detail slide-over open animation: ≤ 150 ms
- Projects/Config overlay open animation: ≤ 150 ms, matching the Story Detail slide-over <!-- new: 2026-07-22 (STORY-022 reconcile) -->
- File upload progress indicator shown for uploads > 1 MB

### Accessibility
- WCAG 2.1 AA compliance required across all views
- All interactive elements (buttons, links, inputs, dropdowns) are keyboard-accessible with visible focus indicators
- All form fields have associated `<label>` elements and ARIA attributes where native labels are insufficient
- Confirmation dialogs trap keyboard focus until dismissed
- Story Detail slide-over traps keyboard focus while open; `Escape` closes it and returns focus to the triggering element
- Task Detail modal traps keyboard focus while open; `Escape` closes it and returns focus to the triggering task card
- **Stacked modals/panels:** when panels or modals are layered on top of one another (e.g. the Attachment Viewer opened from within the Task Detail modal, itself opened from within the Story Detail slide-over), pressing `Escape` closes only the topmost layer — every parent layer stays open, and keyboard focus returns to the control that opened the topmost layer. This rule applies uniformly regardless of which host the topmost layer was opened from. <!-- added: 2026-07-15 (STORY-007 reconcile, BUG-002/003/004) -->
- **Global Projects/Config overlay stacking (STORY-022):** the Projects/Config overlay is reachable and fully visible and interactive from any main-view state, including with a Task Detail modal already open on top of a Story slide-over — it renders above both. Full z-index order (lowest to highest): Story slide-over → Task Detail modal → the Projects/Config overlay panel and its own nested confirmation dialogs → Toast notifications → top bar. `Escape` closes one overlay level per press through the app's shared modal-escape stack, composing correctly with an open Story slide-over / Task Detail modal beneath it (each press closes exactly the topmost layer). <!-- new: 2026-07-22 (STORY-022 reconcile, BUG-007) -->
- **`@role` mention combobox (STORY-008):** the app's first non-native dropdown — every other picker in the app is a native `<select>`, keyboard-accessible by default — and is held to the same WCAG 2.1 AA bar explicitly: it follows the ARIA combobox/listbox pattern, is fully operable from the keyboard (arrow keys to move through matches, `Enter` to select the highlighted match, `Escape` to dismiss without inserting anything and return focus to the textarea at the same cursor position), and never traps focus outside the textarea. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
- Status badges and icons have accessible text alternatives (not colour-only indicators)
- Error messages are announced to screen readers via ARIA live regions

### Icon Library & Action Buttons
- **Lucide React** is the standard icon library for the entire application. No other icon library may be used.
- All item-level action buttons — edit, delete, archive, view, and similar operations — must use Lucide React icons rather than plain text labels.
- Icon-only action buttons must include a visible tooltip (on hover/focus) and an `aria-label` attribute whose value matches the action name (e.g. `aria-label="Edit"`, `aria-label="Delete"`).
- This standard applies to all screens, current and future: Projects, Settings, Stories, Tasks, Sessions, Attachments, Comments, Task Links, Milestones, and Cross-project view.
- Primary CTA buttons (e.g. "Create project", "Save") may combine an icon with a text label; the icon is optional for CTAs.
- Destructive actions (delete, archive) must use a visually distinct icon color (e.g. red/danger tone) to differentiate them from non-destructive actions at a glance.

### Browser & Device Support
- Latest stable Chrome, Safari, Firefox (desktop only)
- Minimum viewport width: 1,024 px
- Mobile responsiveness is not required for V1
- No IE or legacy browser support required

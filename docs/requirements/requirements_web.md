# Web UI Requirements

The Web UI is the browser-based interface for the human orchestrator. It is served by a Docker container with its port mapped to localhost, requires no authentication, and provides full CRUD access to all entities. It consumes the REST API defined in [Backend Requirements](requirements_backend.md).

---

## Feature List

| Feature | Description | Priority |
|---------|-------------|----------|
| Projects Management | Create, edit, delete projects from a dedicated management page | P0 |
| Stories View | List stories per project with filter bar | P0 |
| Board View | Kanban board of all project stories, grouped by story status; milestone-based filtering and tab-disable behaviour deferred to STORY-012 | P0 |
| Story Detail | Full-screen slide-over with task kanban + description/attachments/comments right panel | P0 |
| Task Detail View | Full-screen modal with task metadata, links, attachments, and comments | P0 |
| Project Settings View | Manage per-project dictionary overrides; view effective settings | P0 |
| System Settings View | Manage system-level dictionary defaults | P0 |
| Sessions View | List, create, edit sessions; filter incomplete; link to story/task | P1 |
| Milestones View | List, create, edit, delete milestones within a project | P1 |
| Attachments Management | Upload documents (text or file) and images; view, archive, browse history | P1 |
| Comments Management | Create, edit, delete comments on stories and tasks | P1 |
| Task Links Management | Create and delete typed directed links between tasks | P1 |

---

## Navigation & Routing <!-- updated: 2026-07-07 (UX redesign) -->

### Layout Shell <!-- updated: 2026-07-10 (STORY-016 reconcile) -->

The application uses a three-level layout shell hierarchy:

1. **RootLayout** — flat root shell, always rendered. Hosts the top bar and a content outlet. `/projects`, `/sessions`, and `/settings` render directly here with no sidebar and no sub-nav.
2. **AppShell** — Task Manager mode layer, rendered for all `/projects/:id/*` routes. Hosts the collapsible sidebar alongside the content outlet.
3. **ProjectShell** — per-project layer, rendered inside AppShell for all `/projects/:id/*` routes. Validates the project ID (renders an inline "Not found" with a `/projects` link when the project does not exist), then renders the four-tab sub-nav and a nested outlet for the active tab's content.

**Top bar** (always visible, full width):
- **App switcher** (left): native `<select>` combobox displaying the active app name (`Task Manager` or `Sessions`). Mode is derived live from the current pathname — no local state. Switching to Sessions navigates to `/sessions`; switching back to Task Manager returns to the last Task Manager URL (persisted in browser local storage under key `app:last_task_manager_url`), falling back to `/` which RootRedirect resolves.
- **Settings button** (right, Task Manager mode only): text button `⚙ Settings` navigating to `/settings` (system defaults). Hidden in Sessions mode.

**Left sidebar** (Task Manager mode only, collapsible):
- **Project combobox** at the top: native `<select>` displaying the active project name; selecting a project navigates to `/projects/:id/stories` and records the project ID as the last-visited project.
- **Project list**: all projects as buttons, with the active project highlighted via `aria-current="page"`.
- **`⚙ Gestisci progetti`** link at the bottom → navigates to `/projects` (full-screen project CRUD page).
- **Collapse/expand toggle** (`◄`/`▶`) anchored to the right edge of the sidebar via absolute positioning. When collapsed, only the toggle is visible and the content outlet fills the full width. Collapsed/expanded state is persisted in browser local storage under key `app:sidebar_collapsed` via the shared `useLocalStorage` hook.

**Project sub-navigation** (rendered by ProjectShell for all `/projects/:id/*` routes):
Horizontal tab bar using React Router `NavLink` for automatic active-tab highlighting. Four tabs:
- `Stories` → `/projects/:id/stories`
- `Board` → `/projects/:id/board`
- `Milestones` → `/projects/:id/milestones`
- `Settings` → `/projects/:id/settings`

Sessions mode has no sidebar and no sub-navigation bar.

**RootRedirect** (index route at `/`):
Reads the last-visited project ID from browser local storage (key `app:last_project_id`, exported constant `LAST_PROJECT_KEY` from `RootRedirect.tsx`). Redirects to `/projects/:lastId/stories` if a project ID exists; otherwise redirects to `/projects`.

### Route Table

| Route | View | Description |
|-------|------|-------------|
| `/` | Redirect | → `/projects/:lastId/stories` if a project was previously visited; otherwise → `/projects` |
| `/projects` | Projects Management | Full-screen CRUD table for projects (no sidebar, no sub-nav) |
| `/projects/:id/stories` | Stories List | Stories within the active project |
| `/projects/:id/board` | Stories Board | Kanban of stories grouped by story status |
| `/projects/:id/milestones` | Milestones | Milestones within the active project |
| `/projects/:id/settings` | Project Settings | Per-project dictionary overrides |
| `/projects/:id/stories/:storyId` | Story Detail | Full-screen slide-over on top of the current project view |
| `/projects/:id/stories/:storyId/tasks/:taskId` | Task Detail | Modal on top of the Story Detail slide-over |
| `/milestones/:id` | Milestone Detail | Milestone metadata + stories + attachments + comments *(placeholder)* |
| `/sessions` | Sessions | Full-screen flat list, no sidebar |
| `/settings` | System Settings | Task Manager system-level dictionary defaults |

Navigation rules:
- Navigating to a resource that no longer exists (deleted) shows a "Not found" inline message with a link back to the parent level.
- Breadcrumbs are shown within the Story Detail slide-over header: e.g. `← Stories / Story Title`.
- The last visited project ID is persisted in browser local storage to power the `/` redirect.

---

## Page Behaviours

### Projects Management (`/projects`) <!-- updated: 2026-07-10 (STORY-016 reconcile) -->

> **As-built notes (STORY-003):** Modals use native `<dialog>` elements. The Milestones section previously shown here is now at `/projects/:id/milestones`.
> **As-built notes (STORY-016):** Migrated from the homepage (`/`) to `/projects` as a dedicated full-screen management page (no sidebar, no sub-nav). The route is registered directly under RootLayout, outside AppShell/ProjectShell.

Full-screen management page for projects; no sidebar, no sub-navigation. Accessible via the `⚙ Gestisci progetti` link in the left sidebar or by navigating to `/projects` directly.

- Lists all projects as a table: name, description (truncated), created_at, with per-row edit/delete action buttons (Lucide icons)
- **Create project** button → modal form: name (required, 1–200 chars), description (optional, max 5000 chars); saves on submit
- **Edit** button per project → same form pre-filled in a modal
- **Delete** button per project → confirmation dialog that explicitly names all nested data that will be permanently removed (stories, tasks, attachments, comments, settings overrides)
- Conflict error (409) surfaced as an inline message above the form submit button: API's `error` message verbatim
- Empty state shown when no projects exist (not an error)
- Clicking a project name navigates to its Stories View (`/projects/:id/stories`)

---

### Stories View (`/projects/:id/stories`) <!-- updated: 2026-07-10 (STORY-016 reconcile) -->

> **As-built notes (STORY-004):** Implemented at `/projects/:id` (old route).
> **As-built notes (STORY-016):** Migrated to `/projects/:id/stories` as the `Stories` sub-nav tab inside ProjectShell. The old route `/projects/:id` is no longer valid. The page heading (project name) and breadcrumb from the pre-shell design were removed; the sidebar and sub-nav provide that context. Each story title is a clickable button (`aria-label="Open story: …"`) that opens the Story Detail slide-over. `StoriesPage` persists the active project ID to `LAST_PROJECT_KEY` in local storage on mount, keeping RootRedirect in sync. The `stories` route is a layout route with a nested `:storyId` child route so the Stories list stays mounted behind the slide-over.

Sub-nav active tab: **Stories**.

- Lists stories as a table: title, status (badge), labels (tag chips), task aggregate (e.g. "3/5 done")
- **Filter bar** above the list: status dropdown (populated from project's effective `story_statuses`), label key text input + label value text input
- **Create story** button → form panel: title (required), content (Markdown textarea, optional), status (dropdown, optional), labels editor
- **Edit** button per story row → same form pre-filled
- **Delete** button per story row → confirmation dialog
- Clicking a story title opens the Story Detail slide-over; URL updates to `/projects/:id/stories/:storyId`
- Task aggregate ("3/5 done") is fetched from `GET /stories/:id/aggregate`; "N/A" shown if story has no tasks

---

### Board View (`/projects/:id/board`) <!-- updated: 2026-07-10 (STORY-016 reconcile) -->

Sub-nav active tab: **Board**.

> **As-built notes (STORY-016):** The Board tab is always enabled and shows **all** project stories (no milestone filter). The milestone-based enabling/disabling and filtering behaviour described below in the "Deferred" note is deferred to STORY-012. The Board fetches up to 100 stories (the API page limit); projects with more than 100 stories will silently show only the first 100 — a known gap to be addressed in a future story.
>
> **Deferred to STORY-012:** The `Board` tab being disabled when no active milestone exists; milestone-scoped story display; per-column "Add story" with active milestone pre-assigned.

- One column per effective `story_statuses` dictionary value for the project; columns are derived from the project's effective settings (never hardcoded). Column droppable IDs use the prefix convention `col-<status>` to distinguish them from card IDs (plain story UUIDs).
- Each column header shows the status name and a count of story cards in that column
- Each story card displays: title, labels (tag chips), task aggregate badge
- Cards within a column are ordered by `created_at` ASC
- **Drag-and-drop (dnd-kit):** dragging a card to another column fires an optimistic `PUT /v1/stories/:id` status update (snapshot-and-restore pattern); card snaps back on API failure. A card dropped on a status no longer present in the effective dictionary shows an inline error on the card. The drag logic is isolated in the `useBoardDrag` hook.
- Clicking a story card title opens the Story Detail slide-over; URL updates to `/projects/:id/stories/:storyId`
- Board canvas is horizontally scrollable; all columns remain accessible regardless of sidebar collapsed state
- Stories with `status: null` or a status not present in any active column are silently excluded from the board

---

### Story Detail slide-over (`/projects/:id/stories/:storyId`) <!-- updated: 2026-07-10 (STORY-016 reconcile) -->

> **As-built notes (STORY-016):** The slide-over is implemented as a nested child route of `/projects/:id/stories`. The slide-in animation uses a custom `slide-in-from-right` keyframe defined in `tailwind.config.ts` (no `tailwindcss-animate` dependency). The task kanban inside the slide-over is a placeholder (`TaskKanbanPlaceholder`) that derives column names from the project's effective `task_statuses` dictionary but contains no live task data — live tasks are delivered by STORY-005. Story description is rendered via `react-markdown` using Tailwind arbitrary-property selectors (no `@tailwindcss/typography` dependency). Attachments and comments sections inside the right panel are static placeholders pending STORY-007 and STORY-008. The right panel persists open/closed state per story in browser local storage keyed by story ID via the shared `useLocalStorage` hook.

**Opening:** clicking a story title (from Stories list or Board) triggers a slide-over panel that animates in from the right, covering the sidebar and sub-navigation. The background content is dimmed but not unmounted. The URL updates for deep-linking. Navigating directly to the story URL renders the project view with the slide-over already open.

**Closing:** the `✕` button or `Escape` key closes the slide-over and restores the previous URL (Stories list or Board). The `← Stories` breadcrumb in the slide-over header also closes it and navigates to the Stories list.

**Layout:** two-column inside the slide-over. The main area (left) contains the story header and the task kanban. A collapsible right panel contains the story description (rendered Markdown), story-level attachments, and story-level comments. A toggle button (`‹`/`›` chevron anchored to the panel edge) expands or collapses it. The panel's open/closed state is persisted in browser local storage per story.

```
┌──────────────────────────────────────────┬─────────────────────┐
│  ← Stories / Story Title      ✏  [✕]    │ ›  Right panel      │
│  ─────────────────────────────────────   │                     │
│  Task kanban                             │  Description        │
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

**Task kanban — main area:**

> **As-built (STORY-016):** Rendered as a placeholder (`TaskKanbanPlaceholder`). Column names are derived from the project's effective `task_statuses` dictionary (fallback: `["To Do", "In Progress", "Done"]`). No task endpoint calls are made; each column shows an empty-state placeholder. The full live implementation is delivered by STORY-005.

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

**Right panel — Story Attachments:**

> **As-built (STORY-016):** Static placeholder section. No attachment endpoint calls. Live implementation delivered by STORY-007.

- Lists active attachments: type badge, kind badge, name/url, file_size_bytes, created_at
- "Show archived" toggle reveals archived attachments (greyed out)
- **Add attachment** button → attachment upload panel (see Attachment Upload below)
- **View file** button (document/image) → opens file in new tab via `GET /attachments/:id/file`
- **History** button (document only) → slide-over showing AttachmentVersion list with timestamps
- **Archive** button (document/image) → confirmation dialog
- **Delete** button (external-ref only) → confirmation dialog

**Right panel — Story Comments:**

> **As-built (STORY-016):** Static placeholder section. No comments endpoint calls. Live implementation delivered by STORY-008.

- Lists comments ordered oldest-first: author_role, content (rendered Markdown), labels, timestamp
- **Add comment** → inline form at the bottom of the list
- **Edit** / **Delete** per comment (inline controls)

---

### Task Detail View (`/projects/:id/stories/:storyId/tasks/:taskId`)

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

**Links section:**
- Heading "Links" with count badge
- Single list showing both outbound and inbound links; each row: direction indicator (→ / ←), link_type badge, linked task title (clicking opens that task's modal), linked task status badge
- **Add link** button → inline form below the list: search-by-title input for target task, link_type dropdown
- **Delete** button per link row → confirmation dialog

**Attachments section:**
- Heading "Attachments" with count badge
- Same behaviour as Story Attachments (list, add, view file, history, archive, delete) — see Story Detail above

**Comments section:**
- Heading "Comments" with count badge
- Thread ordered oldest-first: author_role, content (rendered Markdown), labels, timestamp
- **Edit** / **Delete** per comment (inline controls)
- Add comment form pinned at the bottom of the section (scrolls with the content)

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

### Milestone Detail View (`/milestones/:id`)

- Displays: name, description, status badge, story count
- **Edit milestone** button → form panel (name and description only)
- **Stories** section: paginated list of assigned stories; each row shows title, status badge; clicking a title opens the Story Detail slide-over

> **Deferred to STORY-007 and STORY-008:** Attachments and Comments sections.

---

### Sessions View (`/sessions`) <!-- updated: 2026-07-07 (UX redesign) -->

No sidebar and no sub-navigation bar. Full-screen flat view. The app switcher in the top bar shows `Sessions`; the `⚙ Settings` button is hidden.

- Lists sessions as a table: topic, status, participant_role, linked story/task (clickable), created_at, result indicator (✓ / pending)
- **Incomplete only** toggle filter (calls `GET /sessions?incomplete=true`)
- **Create session** button → form panel: topic (required), context (textarea), status, participant_role, optional link to story or task (search inputs)
- **Edit** button per session → same form + result fields (result_decisions textarea, result_summary textarea)
- **Archive** button per session → confirmation dialog
- Clicking a linked story navigates to that story's Story Detail slide-over; clicking a linked task navigates to the task's Task Detail modal (via the story route)

---

### System Settings View (`/settings`) <!-- updated: 2026-07-07 (UX redesign) -->

> **As-built notes (STORY-002):** Previously implemented as two tabs (`System Defaults` / `Project Overrides`) at `/settings`. The Project Overrides tab is removed from this view — project overrides now live at `/projects/:id/settings`.

Accessible via the `⚙ Settings` button in the top bar (Task Manager mode only). No sidebar; no sub-navigation bar.

- Six dictionary editors in a 2-column responsive grid (not accordion), one per key: `task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`
- Each editor shows the current values as an editable chip list (add value via text input + Enter/Add button; remove individual chips)
- **Save / Cancel** controls per editor — Save disabled when the value list is empty
- Per-key independent save state and error state (saving one key does not affect others)
- **Save** calls `PUT /v1/system/settings` with only the changed key (partial body)
- Server errors (400: unknown key, empty values) surfaced inline below the relevant editor

---

### Project Settings View (`/projects/:id/settings`) <!-- updated: 2026-07-07 (UX redesign) -->

> **As-built notes (STORY-002):** Previously implemented as the "Project Overrides" tab within `/settings`. Now a dedicated route accessed via the `Settings` tab in the project sub-navigation bar.

Sub-nav active tab: **Settings**.

- Lists all six dictionary keys with their effective values
- Each key row shows: key name, current override value (if set) with an `Override` badge, or the inherited system default value
- **Override / Edit button** per key → activates inline chip list editor for that key
- **Clear override** button (visible when override is set) → intended to revert to system default; calls `DELETE /v1/projects/:projectId/settings/:key` — **this endpoint does not exist on the backend as of STORY-002; the action fails at runtime** (see Known Gaps in backend requirements)
- **Save** button per key → calls `PUT /v1/projects/:id/settings` with only the changed key
- Effective values always visible via `GET /v1/projects/:id/settings/effective`

---

## Form Behaviours

### Task Form
Fields: title (text, required), content (Markdown textarea, optional), type (dropdown, required), status (dropdown, required), assignee_role (dropdown, optional), creator_role (dropdown, optional), labels editor.

All dropdown options populated from `GET /projects/:id/settings/effective` for the current project.

### Attachment Upload Panel
- **Kind selector:** document / image / external-ref (radio or segmented control)
- **Type dropdown:** populated from project's effective `attachment_types`
- **For document kind:**
  - Mode toggle: "Write Markdown" (textarea) vs "Upload file" (file picker accepting .md, .txt)
  - MIME type auto-detected from mode: `text/markdown` (textarea) or from file extension
- **For image kind:**
  - File picker accepting image/png, image/jpeg, image/gif, image/webp
  - Client-side size check: reject before upload if file > 10 MB with inline error
- **For external-ref kind:**
  - URL text input (required)
  - External status text input (optional)
- Author role text input (optional, free-form)
- Submit button

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
| File > 10 MB selected for image upload | Inline error below file input before upload is attempted: "File must be smaller than 10 MB." |
| Confirmation dialog — user cancels | Dialog closes; no action taken |
| Activating a milestone when one is already active | Confirmation dialog: "This will deactivate '{current active name}'. Continue?" — cancel keeps current state; confirm swaps active milestone |
| Board tab accessed with no active milestone | Board shows all stories without any filter applied; no filter indicator is visible; the Board tab is always enabled |

---

## Non-Functional Requirements

### Performance
- Initial page load (projects list): < 2 s (accessed via Docker localhost port mapping)
- Navigation between views (client-side routing): < 300 ms
- Story Detail slide-over open animation: ≤ 150 ms
- File upload progress indicator shown for uploads > 1 MB

### Accessibility
- WCAG 2.1 AA compliance required across all views
- All interactive elements (buttons, links, inputs, dropdowns) are keyboard-accessible with visible focus indicators
- All form fields have associated `<label>` elements and ARIA attributes where native labels are insufficient
- Confirmation dialogs trap keyboard focus until dismissed
- Story Detail slide-over traps keyboard focus while open; `Escape` closes it and returns focus to the triggering element
- Task Detail modal traps keyboard focus while open; `Escape` closes it and returns focus to the triggering task card
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

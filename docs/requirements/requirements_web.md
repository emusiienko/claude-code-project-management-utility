# Web UI Requirements

The Web UI is the browser-based interface for the human orchestrator. It is served by a Docker container with its port mapped to localhost, requires no authentication, and provides full CRUD access to all entities. It consumes the REST API defined in [Backend Requirements](requirements_backend.md).

---

## Feature List

| Feature | Description | Priority |
|---------|-------------|----------|
| Projects View | List all projects; create, edit, delete | P0 |
| Stories View | List stories per project; create, edit, delete; inline aggregate task state | P0 |
| Tasks View | List tasks within a story; create, edit, delete | P0 |
| Task Detail View | Full task view with embedded links, attachments, and comments | P0 |
| Project Settings View | Manage per-project dictionary overrides; view effective settings | P0 |
| System Settings View | Manage system-level dictionary defaults | P0 |
| Sessions View | List, create, edit sessions; filter incomplete; link to story/task | P1 |
| Attachments Management | Upload documents (text or file) and images; view, archive, browse history | P1 |
| Comments Management | Create, edit, delete comments on stories and tasks | P1 |
| Task Links Management | Create and delete typed directed links between tasks | P1 |
| Cross-project View | List stories and tasks across all projects | P2 |

---

## Navigation & Routing

| Route | View | Description |
|-------|------|-------------|
| `/` | Projects & Milestones | All projects (top section) + all milestones (bottom section) |
| `/projects/:id` | Stories list | Stories within a project |
| `/projects/:id/stories/:storyId` | Story detail | Story metadata + task list + story-level attachments + story-level comments |
| `/projects/:id/stories/:storyId/tasks/:taskId` | Task detail modal | Full-screen modal over the Story Detail View; URL updates on open for deep-linking |
| `/milestones/:id` | Milestone detail | Milestone metadata + assigned stories + milestone attachments + milestone comments |
| `/sessions` | Sessions list | All sessions |
| `/settings` | System settings | System-level dictionary management |
| `/projects/:id/settings` | Project settings | Per-project dictionary overrides |

Navigation rules:
- The top-level navigation bar is always visible and includes: Projects, Sessions, System Settings
- Breadcrumbs are shown on all views below the top level (e.g. Projects → My Project → Story Title → Task Title)
- Navigating to a resource that no longer exists (deleted) shows a "Not found" page with a link back to the parent level

---

## Page Behaviours

### Projects & Milestones View (`/`)

The page is divided into two sections: **Projects** (top) and **Milestones** (bottom).

**Projects section:**
- Lists all projects as a table or card grid: name, description (truncated), created_at
- **Create project** button → inline form or slide-over panel: name (required), description (optional); saves on submit
- **Edit** button per project → same form pre-filled
- **Delete** button per project → confirmation dialog: "Delete project '{name}'? This will permanently remove all its stories, tasks, and attachments." → confirmed DELETE
- Clicking a project name navigates to its Stories View

**Milestones section:**
- **Filter bar:** project dropdown (populated from all projects); selecting a project filters milestones to those associated with it; no selection = all milestones
- Lists milestones as a table: name, associated projects (tag chips), story count, description (truncated)
- **Create milestone** button → form panel: name (required), associated projects (multi-select, required — min 1), description (optional)
- **Edit** button per milestone → same form pre-filled
- **Delete** button per milestone → confirmation dialog: "Delete milestone '{name}'? Stories assigned to it will lose their milestone association."
- Clicking a milestone name navigates to `/milestones/:id`

---

### Milestone Detail View (`/milestones/:id`)

- Displays: name, description, associated projects (tag chips), story count
- **Edit milestone** button → form panel
- **Stories** section: paginated list of assigned stories; each row shows title, project name, status badge; clicking a title navigates to that story's Story Detail View
- **Attachments** and **Comments** sections follow the same behaviour as story-level attachments and comments

---

### Stories View (`/projects/:id`)

- Shows project name as page heading
- Lists stories as a table: title, status (badge), labels (tag chips), task aggregate (e.g. "3/5 done")
- **Filter bar** above the list: status dropdown (populated from project's effective `story_statuses`), label key text input + label value text input
- **Create story** button → form panel: title (required), content (Markdown textarea, optional), status (dropdown, optional), labels editor
- **Edit** button per story row → same form pre-filled
- **Delete** button per story row → confirmation dialog
- Clicking a story title navigates to its Story Detail View
- Task aggregate ("3/5 done") is fetched from `GET /stories/:id/aggregate`; "N/A" shown if story has no tasks

---

### Story Detail View (`/projects/:id/stories/:storyId`)

**Layout:** two-column. The main area (left) contains the story header and the Kanban board. A collapsible right panel contains story-level attachments and comments. A toggle button (`‹`/`›` chevron anchored to the panel edge) expands or collapses it. When collapsed, the Kanban board fills the full width. The panel's open/closed state is persisted in browser local storage per story.

```
┌────────────────────────────────────┬─────────────────┐
│  Story header                      │ ›  Right panel  │
│  ────────────────────────────────  │                 │
│  Kanban board (tasks)              │  Attachments    │
│                                    │  ─────────────  │
│                                    │  Comments       │
└────────────────────────────────────┴─────────────────┘
                                      ↑ collapsible
```

**Story header (always visible):**
- Displays title, status badge, labels, rendered Markdown content (truncated with "Show more" if long)
- **Edit story** button → form panel

**Kanban board — main area:**
- One column per status value in the project's effective `task_statuses` dictionary, ordered as defined in the dictionary
- Each column header shows the status name and a count of cards in that column
- Each task card displays: title, type badge, assignee_role (if set), label chips
- Cards within a column are ordered by `created_at` ASC
- **Drag-and-drop:** dragging a card to another column updates the task's `status` via `PUT /tasks/:id`; optimistic update — card snaps back and an error toast is shown on API failure
- **Filter bar** above the board: type, assignee_role, creator_role — all dropdowns from project's effective settings; active filters dim non-matching cards without removing columns
- **Add task** button at the bottom of each column → form panel with that column's status pre-filled (read-only in this context)
- Clicking a card title navigates to its Task Detail View
- **Edit** and **Delete** via card context menu (⋯ icon on hover)

**Right panel — Story Attachments:**
- Lists active attachments: type badge, kind badge, name/url, file_size_bytes, created_at
- "Show archived" toggle reveals archived attachments (greyed out)
- **Add attachment** button → attachment upload panel (see Attachment Upload below)
- **View file** button (document/image) → opens file in new tab via `GET /attachments/:id/file`
- **History** button (document only) → slide-over showing AttachmentVersion list with timestamps
- **Archive** button (document/image) → confirmation dialog
- **Delete** button (external-ref only) → confirmation dialog

**Right panel — Story Comments:**
- Lists comments ordered oldest-first: author_role, content (rendered Markdown), labels, timestamp
- **Add comment** → inline form at the bottom of the list
- **Edit** / **Delete** per comment (inline controls)

---

### Task Detail View (`/projects/:id/stories/:storyId/tasks/:taskId`)

**Layout:** full-screen modal overlay on top of the Story Detail View. The story board behind it is dimmed but not unmounted. The modal has a fixed header (task title + close button) and a single vertically scrollable body containing all sections. No collapsible panels — all sections are always visible and stacked in order.

Opening: clicking a task card on the Kanban board opens the modal and updates the URL. Navigating directly to the task URL renders the Story Detail View with the modal already open.

Closing: the `✕` button or the `Escape` key closes the modal and restores the URL to the story route.

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
- Same behaviour as Story Attachments (list, add, view file, history, archive, delete) — see Story Detail View above

**Comments section:**
- Heading "Comments" with count badge
- Thread ordered oldest-first: author_role, content (rendered Markdown), labels, timestamp
- **Edit** / **Delete** per comment (inline controls)
- Add comment form pinned at the bottom of the section (not the modal — it scrolls with the content)

---

### Sessions View (`/sessions`)

- Lists sessions as a table: topic, status, participant_role, linked story/task (clickable), created_at, result indicator (✓ / pending)
- **Incomplete only** toggle filter (calls `GET /sessions?incomplete=true`)
- **Create session** button → form panel: topic (required), context (textarea), status, participant_role, optional link to story or task (search inputs)
- **Edit** button per session → same form + result fields (result_decisions textarea, result_summary textarea)
- **Archive** button per session → confirmation dialog
- Clicking a linked story/task navigates to that resource

---

### System Settings View (`/settings`)

- Six accordion sections, one per dictionary key: `task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`
- Each section shows the current values as editable tag/chip input (add tag, remove tag)
- **Save** button per section (calls `PUT /system/settings` with that key)
- Warning shown if removing a value that is currently in use (informational, not blocking)

---

### Project Settings View (`/projects/:id/settings`)

- Same six-section layout as System Settings
- Each section shows: "Using system default: [values]" when no project override is set
- **Override** button per section → activates edit mode for that key; shows current system default pre-filled
- **Clear override** button (visible when override is set) → reverts to system default for that key
- **Save** button per section (calls `PUT /projects/:id/settings`)
- **Effective settings** read-only summary always visible at top (calls `GET /projects/:id/settings/effective`)

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
| API 404 — navigated resource deleted | "Not found" page with back-navigation link |
| API 500 — server error | Toast notification: "An unexpected error occurred. Please try again." |
| Network unreachable | Toast notification: "Cannot connect to the server. Make sure the utility is running." |
| File > 10 MB selected for image upload | Inline error below file input before upload is attempted: "File must be smaller than 10 MB." |
| Confirmation dialog — user cancels | Dialog closes; no action taken |

---

## Non-Functional Requirements

### Performance
- Initial page load (projects list): < 2 s (accessed via Docker localhost port mapping)
- Navigation between views (client-side routing): < 300 ms
- File upload progress indicator shown for uploads > 1 MB

### Accessibility
- WCAG 2.1 AA compliance required across all views
- All interactive elements (buttons, links, inputs, dropdowns) are keyboard-accessible with visible focus indicators
- All form fields have associated `<label>` elements and ARIA attributes where native labels are insufficient
- Confirmation dialogs trap keyboard focus until dismissed
- Status badges and icons have accessible text alternatives (not colour-only indicators)
- Error messages are announced to screen readers via ARIA live regions

### Browser & Device Support
- Latest stable Chrome, Safari, Firefox (desktop only)
- Minimum viewport width: 1,024 px
- Mobile responsiveness is not required for V1
- No IE or legacy browser support required

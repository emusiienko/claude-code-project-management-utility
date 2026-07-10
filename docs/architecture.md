# Architecture — AI Agent Coordination Utility

> Status: v1.0 (Project Setup) — established 2026-06-29
> A single-developer, locally-hosted utility that stores the operational state of a multi-agent
> development pipeline outside of git. Exposed to AI agents via an MCP server and to the human
> orchestrator via a web UI, both over a shared REST/service core.

---

## Tech Stack

### Backend (single codebase, two access surfaces)

| Dependency | Version | Rationale |
|---|---------|---|
| Python | 3.12    | Modern, stable; strong typing support; first-class async. |
| FastAPI | ^0.138  | REST API with built-in validation, OpenAPI generation, async support. |
| Uvicorn | ^0.49   | ASGI server for FastAPI. |
| Pydantic | ^2.13   | Request/response schemas, dictionary validation, settings parsing. |
| SQLAlchemy | ^2.0    | DB-agnostic ORM — same models run on SQLite and PostgreSQL (see ADR-002). |
| Alembic | ^1.18   | Schema migrations, written portably for both dialects. |
| `mcp` (Model Context Protocol SDK) | ^1.0    | Official Python MCP server, HTTP streamable transport, path-mounted on the shared backend app/port (see ADR-003, ADR-007). |
| psycopg (binary) | ^3.1    | PostgreSQL driver — used only when `DATABASE_URL` targets Postgres. |
| (stdlib `sqlite3`) | —       | SQLite driver — default, zero external service. |

### Frontend

> Internal structure and exact library pinning are owned by **frontend-developer** in
> `docs/frontend-coding-conventions.md`. The list below records the agreed high-level stack only.

| Dependency      | Rationale |
|-----------------|---|
| React 19 + Vite | SPA justified by rich interactivity (Kanban drag-and-drop, modal deep-linking, optimistic updates). See ADR-006. |
| React Router    | Client-side routing (< 300 ms navigation requirement). |
| TanStack Query  | Server-state cache, optimistic updates, request dedup. |
| Tailwind CSS    | Utility-first styling — fewer custom CSS surfaces. |
| dnd-kit         | Accessible drag-and-drop for the Kanban board. |
| react-markdown  | Render Markdown content (story/task content, comments). |
| lucide-react    | <!-- updated: 2026-07-06 --> Sole icon library — item/row-level action buttons (Edit, Delete, etc.) use Lucide icons via the shared `IconButton` primitive; per-icon named imports keep tree-shaking effective. Mandated by requirements; see STORY-015. |

### Infrastructure

| Dependency                         | Rationale |
|------------------------------------|---|
| Docker + Docker Compose            | Whole stack runs on a single developer machine; ports mapped to localhost only. |
| nginx (frontend container)         | Serves the static React build and is the single web entry. |
| PostgreSQL 18 (optional container) | Activated via a Compose profile only when `DATABASE_URL` targets Postgres. |
| uv (backend image dependency install) | <!-- updated: 2026-07-02 --> The backend image installs Python dependencies with `uv sync --frozen` against the committed `backend/uv.lock`, matching the local dev toolchain and giving reproducible, locked builds. Runtime commands (`alembic`, `uvicorn`) run from the uv-managed venv (on `PATH`). See STORY-014. |

---

## Repository Layout (monorepo)

Two top-level application folders; documentation and orchestration files at the root.

```
/  (repo root)
  backend/            # Python application (REST + MCP, shared service core)
  frontend/           # React SPA
  docs/               # SDLC documentation (this file lives here)
  docker-compose.yml  # owned by devops
  deploy.sh           # single entry point — owned by devops
  CLAUDE.md           # project navigation — owned by architect
```

See ADR-004 for the monorepo + app-based decision.

---

## System Modules

### Backend — app-based modular monolith

Each domain is a **top-level package** ("app") holding its own vertical slice: a **controller**
(the module that manages the REST router), the **MCP tools**, a domain service, ORM models, and
Pydantic schemas. `core` sits at the same level and holds only cross-cutting concerns. The controller
and the MCP tools are **thin layers** over each app's service — the service layer is the single home
of business logic and the only layer that touches the data layer.

- `backend/app/core/` — app factory, configuration, DB engine/session, centralized error handling, filesystem storage helper, dictionary-resolution helper, common base classes
- `backend/app/projects/` — Project CRUD <!-- updated: 2026-07-06 (STORY-003 reconcile): full domain slice — model, repository, service, schema, REST controller (five `/v1` endpoints), and five mirrored MCP tools. Replaced the STORY-013 stub wholesale. First true domain entity; establishes the per-domain package pattern for stories 004+. -->
- `backend/app/stories/` — Story CRUD + on-demand task aggregation <!-- updated: 2026-07-07 (STORY-004 reconcile): full domain slice built — model, repository (dialect-aware label-filtered paginated list, ADR-012), service (parent-project existence, effective `story_statuses` validation via the `EffectiveDictionary` Protocol, label-replace semantics), schema, single REST router at `/v1/stories`, and five mirrored MCP tools. On-demand task aggregation (`GET /stories/:id/aggregate`) remains deferred to STORY-005 (tasks). -->
- `backend/app/tasks/` — Task CRUD + detail composition + on-demand dependency computation
- `backend/app/task_links/` — typed directed links between tasks (same project only)
- `backend/app/attachments/` — document/image/external-ref attachments + version history; filesystem-backed
- `backend/app/comments/` — comments on stories/tasks/milestones
- `backend/app/sessions/` — session records + incomplete-session query
- `backend/app/milestones/` — milestones + project association (M:N) + story assignment
- `backend/app/settings/` — system + project dictionaries; effective-dictionary resolution
- `backend/app/api/` — resolving and uniting separate routers, managing API versions, starting from V1, a lightweight component
- `backend/app/mcp/` — resolving mcp protocol
- `backend/migrations/` — Alembic migration scripts

### Frontend — feature-based decomposition

> Internal organization owned by frontend-developer; recorded here at folder-boundary level only.

- `frontend/src/app/` — application composition root and layout shells: providers, router, query client, and the three nested layout shells (`RootLayout`, `AppShell`, `ProjectShell`) plus the top-bar/sidebar/redirect components
- `frontend/src/features/` — one folder per feature/screen (projects, stories, board, settings, and lazy-loaded placeholders for tasks, task-links, attachments, comments, sessions, milestones, cross-project)
- `frontend/src/shared/` — reusable UI components, hooks, utilities
- `frontend/src/core/` — REST client and cross-cutting client concerns
- `frontend/src/api/` — contract types, endpoint functions, path/config constants
- `frontend/src/config/` — cache-key registry and other client config

<!-- updated: 2026-07-10 (STORY-016 reconcile) -->
**Navigation model (redesigned in STORY-016, supersedes the STORY-002 flat top-nav; see ADR-014):**
the shell is a **three-level nested layout hierarchy** driven by an **app switcher**, replacing the
former flat three-item top nav (Projects / Sessions / Settings).

- **RootLayout** (flat root) — hosts the top bar: an app-switcher combobox (`Task Manager` /
  `Sessions`) on the left and a `⚙ Settings` button on the right (Task Manager mode only). `/projects`,
  `/sessions`, and `/settings` render directly in its outlet with **no** project chrome.
- **AppShell** (Task Manager mode) — renders the **collapsible project sidebar** (project combobox,
  project list with active highlight, `⚙ Gestisci progetti` link to `/projects`) beside its outlet.
  Collapsed state persists in local storage. All project-scoped routes (`/projects/:id/*`) render here.
- **ProjectShell** — renders the four-tab per-project **sub-navigation** (Stories, Board, Milestones,
  Settings) with active-tab highlight, plus a nested outlet. An unknown project ID renders an inline
  "Not found" message linking back to `/projects`.

Leaf routes render in the ProjectShell outlet: Stories list (`/projects/:id/stories`), Board
(`/projects/:id/board`), Milestones (`/projects/:id/milestones` — still the STORY-012 placeholder),
and Project Settings (`/projects/:id/settings`). The **Story Detail slide-over** is a **nested child
route** of the Stories list (`/projects/:id/stories/:storyId`): it animates in from the right over a
dimmed, still-mounted list/board, so a direct visit renders the project view with the slide-over
already open; `✕`, `Escape`, and the `← Stories` breadcrumb close it back to the parent route.

`/` is a redirect (`RootRedirect`) to `/projects/:lastId/stories` using the last-visited project ID
from local storage, or `/projects` when none exists. In Sessions mode (`/sessions`) no sidebar and no
sub-nav render and the `⚙ Settings` button is hidden.

The prior top-level nav rule still holds in spirit: the remaining domains (Tasks, Task Links,
Attachments, Comments) are sub-views reached through their parent context, not app-switcher entries.
Sessions is now a distinct **app** (via the switcher), not a top-nav item.

---

## Module Relations

- `controller (REST router) → app service`: each controller calls only its app's service; never the data layer directly.
- `MCP tools → app service`: MCP tools call the same services the controllers use — one logic path, two surfaces.
- `app service → core`: services use `core` for DB sessions, dictionary resolution, storage, and error types.
- `app service → data layer`: services own all queries; the data layer (ORM models) is private to the backend.
Parent / container / reference existence:
- `stories service → projects data`: a story requires an existing parent project; the project scopes dictionary resolution.
- `tasks service → stories data`: a task requires an existing parent story; the owning project is resolved transitively (`task → story → project`).
- `task_links service → tasks data`: a link requires both source and target tasks to exist, be in the same project, and differ (no self-link); uniqueness on (source, target, link_type).
- `attachments service → stories/tasks/milestones data`: the container (`container_type`) must exist before an attachment is created.
- `comments service → stories/tasks/milestones data`: the container (`container_type`) must exist before a comment is created.
- `sessions service → stories/tasks data`: optional `linked_story_id` / `linked_task_id` are validated to exist on create/update (SET NULL when the referenced story/task is deleted).

Dictionary validation:
- `stories / tasks / task_links / attachments services → settings service`: before any dictionary-bound write, the owning project's effective dictionary is resolved and the value validated — `story_statuses` (story), `task_types` + `task_statuses` + `participant_roles` (task), `link_types` (task_link), `attachment_types` (attachment). Comments have no dictionary-bound fields.

Aggregation / composition (a service reads another app's data to assemble a derived/composed response):
- `stories service → tasks data`: story aggregation (`GET /stories/:id/aggregate`) derives per-status counts from tasks (on demand).
- `tasks service → task_links data`: task detail/dependency (`GET /tasks/:id/detail`, `/dependencies`) reads inbound/outbound links.
- `tasks service → attachments data`: task detail (`GET /tasks/:id/detail`) composes the task's active attachments.
- `tasks service → comments data`: task detail (`GET /tasks/:id/detail`) composes the task's comments (created_at ASC).
- `stories service → attachments data` & `stories service → comments data`: story detail (`GET /stories/:id/detail`) composes the story's active attachments and comments (side collections only; tasks are not included — they are board-driven via the tasks list + aggregate).
- `milestones service → attachments data` & `milestones service → comments data`: milestone detail (`GET /milestones/:id/detail`) composes the milestone's active attachments and comments (assigned stories are not included — paginated via `GET /milestones/:id/stories`).
- `milestones service → stories data`: milestone `story_count` and `GET /milestones/:id/stories` derive/compose assigned stories (also listed under Milestones).

> Note: `projects` has no composition relation to `stories`. Listing a project's stories
> (`GET /projects/:projectId/stories`) is the *stories* service filtered by `project_id` (captured as
> `stories → projects`); the projects service derives nothing from stories. Project→Story containment
> is expressed by the FK + `ON DELETE CASCADE` in the schema, not by a runtime service dependency.

Milestones:
- `milestones service → projects data`: validates that every associated project exists and enforces name uniqueness within each associated project (M:N via the milestone_project join).
- `milestones service → stories data`: reads assigned stories (`story_count`, milestone story list) and blocks removing a project that still has stories assigned to the milestone.
- `stories service → milestones data`: assigning `milestone_id` validates that the story's project is in the milestone's associated project set.

Storage & client:
- `attachments service → core.storage`: file read/write/snapshot on the attachments volume.
- `frontend api layer → REST API`: the SPA consumes the REST contract; it never talks to MCP.

No circular dependencies: controllers and MCP tools depend on services, services depend on core and the data layer; core depends on nothing app-specific.

---

## Data Flow

### Write path (REST or MCP), e.g. "create task"

1. Request arrives at an entry layer — the REST controller (`POST /stories/:storyId/tasks`) or an MCP tool (`create_task`).
2. The controller / tool parses input into the app's Pydantic schema. <!-- updated: 2026-07-06 (STORY-003 reconcile) --> **Field-level validation (length, non-empty, format) lives in the schema via `@field_validator`** and fails as 422 through FastAPI's request-validation handler before the service is reached. Entry layers pass **string IDs straight through** — they never parse UUIDs (see ADR-011).
3. It calls the app **service**. The service owns business-rule validation only (uniqueness, cross-field, existence). String IDs are coerced to `UUID` inside `BaseRepository`, which raises `NotFoundError` (404) for a malformed ID (ADR-011).
4. Service resolves the owning **project** transitively (`task.story_id → story.project_id`) and loads that project's **effective dictionaries** via the settings service.
5. Service validates dictionary-bound fields (`type`, `status`, `assignee_role`, `creator_role`); on violation raises a domain error → 422.
6. Service persists via the data layer inside a transaction; timestamps set by the layer.
7. Service returns a domain object; the controller / tool serializes it to the standard envelope `{ "data": {...} }`.

### Read path with composition, e.g. "task detail"

1. `GET /tasks/:id/detail` → tasks service.
2. Service loads the task, its links (enriched with linked task id/title/status), active attachments (metadata only), and comments (created_at ASC) in one service call.
3. Adapter returns `{ "data": { ...task, links, attachments, comments } }`.

### File path, e.g. "attachment file"

1. Document/image content is written to the attachments volume by `core.storage`; the DB stores metadata + a server-internal `file_path` (never exposed).
2. `GET /attachments/:id/file` streams the file with `Content-Type = mime_type`.
3. Each document content update writes a new snapshot file and an `AttachmentVersion` row (history is read-only).

---

## Database Schema

DB-agnostic via SQLAlchemy; identical schema on SQLite (default) and PostgreSQL. Portability notes
are normative constraints for the backend implementor (see ADR-002).

> **ORM layer scope:** the architecture fixes only *SQLAlchemy 2.0 + Alembic, DB-agnostic via `DATABASE_URL`*.
> The precise persistence layer — plain SQLAlchemy ORM vs a higher-level wrapper such as SQLModel — is
> a backend-developer decision recorded in `docs/backend-coding-conventions.md`, provided it preserves
> DB-agnosticism and the portability constraints below (UUID, JSON `labels` filtering, case-insensitive
> uniqueness, WAL). ORM models and Pydantic API schemas are kept as separate concerns.

### Tables

- **project** — `id` (UUID PK), `name` (unique, case-insensitive, 1–200), `description`, `created_at`, `updated_at`
- **story** — `id`, `project_id` (FK→project, CASCADE), `title`, `content`, `status` (validated vs effective `story_statuses`), `labels` (JSON array), `milestone_id` (SET NULL — see below), `created_at`, `updated_at` <!-- updated: 2026-07-07 (STORY-004 reconcile): `0003_story` ships `milestone_id` as an **FK-less** nullable column; the intended FK→milestone (`ON DELETE SET NULL`) is added by STORY-012's migration when the `milestone` table is created. See ADR-013. -->
  - Three indexes: `(project_id, created_at DESC)`, `(project_id, status)`, `(milestone_id)`.
- **task** — `id`, `story_id` (FK→story, CASCADE), `title`, `content`, `type`, `status`, `assignee_role`, `creator_role`, `labels` (JSON array), `created_at`, `updated_at`
- **task_link** — `id`, `source_task_id` (FK→task, CASCADE), `target_task_id` (FK→task, CASCADE), `link_type`; unique (`source_task_id`, `target_task_id`, `link_type`); `target ≠ source`; both tasks same project
- **attachment** — `id`, `container_type` (story|task|milestone), `container_id`, `type`, `kind` (document|image|external-ref), `mime_type` (cond.), `file_size_bytes` (cond.), `file_path` (internal, never exposed), `archived_at`, `external_url` (cond.), `external_status`, `created_at`, `updated_at`
- **attachment_version** — `id`, `attachment_id` (FK→attachment document-kind, CASCADE), `file_path`, `file_size_bytes`, `author_role`, `created_at` (read-only history)
- **comment** — `id`, `container_type` (story|task|milestone), `container_id`, `author_role`, `content`, `labels` (JSON array), `created_at`, `updated_at`
- **session** — `id`, `topic`, `context`, `result_decisions`, `result_summary`, `status` (free-form), `participant_role`, `linked_story_id` (FK→story, SET NULL), `linked_task_id` (FK→task, SET NULL), `archived_at`, `created_at`, `updated_at`
- **system_settings** — `key` (PK, one of six dictionary keys), `values` (JSON array, ≥1), `updated_at`
- **project_settings** — composite PK (`project_id` FK→project CASCADE, `key`), `values` (JSON array, ≥1 — fully replaces system default; replace-never-merge per ADR-008), `updated_at`
- **milestone** — `id`, `name` (unique within each associated project), `description`, `created_at`, `updated_at`
- **milestone_project** — composite PK (`milestone_id` FK→milestone CASCADE, `project_id` FK→project CASCADE) — M:N join

### Relations & cascade

Project → Story → Task all CASCADE; Story/Task/Milestone → Attachment/Comment CASCADE; Attachment(document) → AttachmentVersion CASCADE; Task → TaskLink CASCADE (either side); Session → Story/Task SET NULL; Milestone ↔ Project join CASCADE; Story → Milestone SET NULL.

### Indexes

As specified in the backend requirements: story `(project_id, created_at DESC)` and `(project_id, status)` and `(milestone_id)`; task `(story_id, status)`, `(story_id, type)`, `(assignee_role)`, `(creator_role)`; task_link `(source_task_id, link_type)` and `(target_task_id, link_type)`; attachment `(container_type, container_id, type, archived_at)`; attachment_version `(attachment_id, created_at DESC)`; comment `(container_type, container_id, created_at ASC)`; session `(archived_at, result_decisions)`, `(linked_story_id)`, `(linked_task_id)`; milestone_project `(milestone_id)` and `(project_id)`.

### Portability constraints (SQLite ⇄ PostgreSQL)

- **UUID** — portable UUID type: native `uuid` on Postgres, `CHAR(36)` string on SQLite.
- **labels (JSON array)** — JSON type mapping to `jsonb` (Postgres) / `JSON` text (SQLite). Filtering by `label_key`/`label_value` is dialect-aware inside the data layer (`json_each` + `json_extract` on SQLite; `jsonb_array_elements` + `@>` containment on Postgres, each in an `EXISTS` subquery). Services and controllers see one neutral `label_key`/`label_value` interface. <!-- updated: 2026-07-07 (STORY-004 reconcile): implemented and proven portable in the story repository — first JSON-array filter in the codebase; reusable by tasks/comments. Dialect detected via `session.get_bind().dialect.name`. See ADR-012. -->
  - A `label_key` no story carries yields an empty page (never an error); `label_key` and `label_value` narrow independently. JSON-array filters are not B-tree indexable — acceptable at the ≤1,000-row list scale.
- **Case-insensitive uniqueness** (project/milestone name) implemented dialect-aware (e.g. `LOWER()` functional uniqueness).
- **Concurrency** — SQLite runs in WAL mode to allow concurrent reads under the ≥5-request concurrency requirement.
- **Migrations** — Alembic scripts avoid dialect-only DDL; branch only where unavoidable. <!-- updated: 2026-07-06 (STORY-003 reconcile) --> The chain is authored in **dependency order, root-table-first**: `project` is the first revision (`0001_project`, down: None), children come after, and every FK is declared **inline** toward an already-existing parent (no deferred FK, no `batch_alter_table`). Each schema revision **bundles its own seed** in the same `upgrade()`. See ADR-010. The functional `LOWER(name)` unique index is created via `op.create_index(..., sa.text("LOWER(name)"))` in the migration (not `__table_args__`), for portable reflection across dialects. <!-- updated: 2026-07-07 (STORY-004 reconcile): `0003_story` (down: `0002_settings`) creates the `story` table with an inline `project_id` FK and three indexes. The one exception to inline-FK-toward-existing-parent is `story.milestone_id`: it ships as an FK-less column because its parent `milestone` table is created only in STORY-012, which adds the FK then (portably; SQLite needs `batch_alter_table`). See ADR-013. -->
  - **UUID DDL:** migration DDL declares UUID columns as `String(36)` (portable across both dialects); the dialect abstraction (`UUIDType`) lives in the ORM layer, not in the migration.

### Seed data

<!-- updated: 2026-07-06 (STORY-003 reconcile): ADR-010 supersedes ADR-009 — seed is now bundled into the same revision as its schema, not a separate seed-only migration. -->
Seed data is bundled into the schema revision that creates the table it populates (ADR-010). The
chain is two revisions: `0001_project` creates the `project` table and seeds one "Test Project" row
(fixed UUID `00000000-0000-0000-0000-000000000001`, deterministic timestamps); `0002_settings`
creates `system_settings` + `project_settings` (inline `project_settings → project` FK,
`ON DELETE CASCADE`) and seeds the six dictionaries in the same `upgrade()`. `system_settings` is
therefore populated at install with no runtime bootstrap, with the six dictionaries:

- `task_statuses`: `["todo", "in-progress", "done"]`
- `task_types`: `["task", "bug", "testing-task"]`
- `story_statuses`: `["planned", "in-progress", "pending-approval", "accepted"]`
- `attachment_types`: `["plan", "document", "image", "implementation-report", "test-result", "external-ref"]`
- `link_types`: `["depends-on", "context"]`
- `participant_roles`: `["orchestrator", "architect", "backend-developer", "frontend-developer", "devops", "spec-writer", "qa-automation", "manual-qa"]`

A brand-new project requires no configuration — absent `project_settings` rows fall through to system defaults.

---

## Authentication Flow

**None — by deliberate design.** This is a single-developer personal tool. The access boundary is
Docker port mapping to `localhost` only; no service is exposed to the network. There is no login,
no session token, no roles, and no authorization checks. Human and agents are structurally equal
participants. `participant_role` / `author_role` / `assignee_role` are descriptive metadata, never
access-control mechanisms.

---

## State Management (client)

- **Server state** lives in TanStack Query; mutations invalidate the relevant queries. Kanban
  drag-and-drop uses optimistic updates that roll back on failure. <!-- updated: 2026-07-10 (STORY-016 reconcile): the **Board** drags **stories** between status columns via `PUT /v1/stories/:id` (optimistic cache update, rollback on error; columns derived from the project's effective `story_statuses` dictionary, never hardcoded). The task-level Kanban that drags tasks via `PUT /tasks/:id` is still deferred to STORY-005; the slide-over renders a task-kanban placeholder only. -->
- **Local UI state** is persisted in browser local storage via a shared `useLocalStorage` hook. <!-- updated: 2026-07-10 (STORY-016 reconcile) --> Three consumers: the sidebar collapsed/expanded state (global), the last-visited project ID (drives the `/` redirect and app-switch return target), and the story-detail right-panel open/closed state (persisted **per story**, keyed by story ID).
- The frontend holds **no business logic** — all validation and dictionary rules are server-side;
  the UI only mirrors them for UX (e.g. populating dropdowns from `GET /projects/:id/settings/effective`).

---

## Error Handling Strategy

Centralized in `core`. All domain errors map to the standard shape:

```json
{ "error": "Human-readable message.", "code": "ERROR_CODE", "details": [ { "field": "...", "message": "..." } ] }
```

| Code | HTTP | Log level |
|---|---|---|
| VALIDATION_ERROR | 400 | DEBUG |
| NOT_FOUND | 404 | DEBUG |
| CONFLICT | 409 | DEBUG |
| UNPROCESSABLE | 422 | DEBUG (dictionary violations) |
| INTERNAL_ERROR | 500 | ERROR (full stack logged server-side only; generic message to client) |

The MCP adapter maps the same domain errors to MCP tool errors so agents receive equivalent,
machine-readable failures. `details` is omitted when not applicable.

<!-- updated: 2026-07-06 (STORY-003 reconcile) -->
The domain→MCP mapping is a single `DomainError.to_tool_error()` instance method (deferred `fastmcp`
import in `core`) returning a `ToolError` with the `[CODE] message` shape — MCP tool modules call
`exc.to_tool_error()` rather than each defining a local conversion helper (ADR-011). Note the two
distinct 4xx validation paths, both carrying a validation semantic: **structural** field errors
(schema `@field_validator`) surface through FastAPI's request-validation handler as **422**, while the
domain `ValidationError` class maps to **400**; dictionary/business violations use `UnprocessableError`
→ **422**. Domains should raise the class matching the intended HTTP status per the table above.

---

## Environment Configuration

Configuration is read from environment variables (12-factor); secrets are not applicable (no auth,
local-only). Variables grouped by concern:

**Database**
- `DATABASE_URL` — single switch between dialects. SQLite (default) e.g. `sqlite:///data/app.db`; PostgreSQL e.g. `postgresql+psycopg://user:pass@db:5432/app`.

**Storage**
- `ATTACHMENTS_DIR` — server-managed directory (Docker volume) for attachment files and version snapshots; outside the web root; paths never constructed from user input.

**Service ports (localhost-mapped only)**
- Backend `:8000` (single port serving **both** REST and the MCP server — MCP is path-mounted on the same app, e.g. `/mcp`, not a separate port; see ADR-007), Web UI `:3000` (defaults; final mapping owned by devops in `docker-compose.yml`).

**CORS**
- `CORS_ALLOWED_ORIGINS` — localhost origins for the Web UI (no reverse proxy in V1).
- <!-- updated: 2026-07-06 (STORY-003 reconcile) --> CORS `allow_methods` is an **explicit** list (`GET, POST, PUT, PATCH, DELETE, OPTIONS`), not a wildcard — a wildcard silently omitted `DELETE` from preflight responses and browsers blocked project deletion (BUG-009). Any new HTTP method must be added to this list.

**Limits**
- Rate limit 1,000 req/min on all endpoints; attachment upload max 10 MB.

**Dev vs prod** — same image; differences are env-only (`DATABASE_URL`, log verbosity). PostgreSQL
is enabled through a Docker Compose profile activated only when `DATABASE_URL` targets Postgres;
with SQLite there is no `db` container.

---

## Non-Functional Targets (from requirements)

- Single-resource CRUD p95 < 200 ms; list (≤1,000) p95 < 500 ms; story aggregate (≤500 tasks) < 300 ms; task detail (≤100 attachments + 200 comments) < 500 ms; ≥5 concurrent requests without degradation.
- Frontend initial load < 2 s; client navigation < 300 ms; upload progress shown for files > 1 MB.
- WCAG 2.1 AA across all views; desktop-only, min viewport 1,024 px.

---

## Known Divergences (reconcile log)

<!-- updated: 2026-06-30 (STORY-002 reconcile) -->

- **Settings surfaces are split by scope (STORY-016).** <!-- updated: 2026-07-10 (STORY-016 reconcile) -->
  Global `/settings` now shows **only** system-level dictionary defaults; its former "Project
  Overrides" tab was removed. The project-overrides UI (the existing effective-settings panel,
  unchanged) is relocated to the `Settings` sub-nav tab at `/projects/:id/settings` inside
  ProjectShell. This is a relocation of already-working UI — the clear-override gap below is neither
  fixed nor worsened by STORY-016 and remains open.

- **Clear-override has no end-to-end surface.** The Settings acceptance criterion "a project override
  for a specific key can be cleared, restoring the system default" is **not satisfied end to end** as
  built. The backend *service* implements `clear_project_setting` (delete the `(project, key)` override
  row), but **no REST route or MCP tool exposes it** — the LOCKED v1.0 contract defines clearing only
  conceptually "within `PUT /projects/:id/settings` semantics", yet `PUT` can only *set* a non-empty
  override (an empty list is rejected with "Dictionary values cannot be empty."), so `PUT` cannot clear.
  Meanwhile the **frontend** calls `DELETE /v1/projects/:projectId/settings/:key`, which **does not
  exist** on the backend (there are zero `DELETE` routes in the Settings controller). Net effect: the
  UI "Clear override" action fails, and there is no contract-blessed way to clear an override.
  - **Resolution path (out of architect reconcile scope — needs a follow-up):** this requires a
    contract revision off LOCKED v1.0 to add an explicit clear operation (recommended: `DELETE
    /projects/:projectId/settings/:key` → `204 | 404`, mirroring the existing service method and the
    frontend's current call), plus a backend REST route + MCP tool to expose `clear_project_setting`.
    Tracked here so STORY-003+ and the next contract revision pick it up; not fixed during this
    documentation reconcile.

## Out of Scope (V1)

Multi-user/auth/RBAC, markdown migration tooling, notifications/webhooks/event streams, process
enforcement/workflow automation, and a first-class "test run" entity — all explicitly deferred per
the validated idea. The utility stores facts; it does not drive process.

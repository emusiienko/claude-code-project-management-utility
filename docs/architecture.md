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
- `backend/app/stories/` — Story CRUD + on-demand task aggregation <!-- updated: 2026-07-07 (STORY-004 reconcile): full domain slice built — model, repository (dialect-aware label-filtered paginated list, ADR-012), service (parent-project existence, effective `story_statuses` validation via the `EffectiveDictionary` Protocol, label-replace semantics), schema, single REST router at `/v1/stories`, and five mirrored MCP tools. On-demand task aggregation (`GET /stories/:id/aggregate`) remains deferred to STORY-005 (tasks). --> <!-- updated: 2026-07-12 (STORY-005 reconcile): on-demand task aggregation (`GET /stories/:id/aggregate`) now built on the stories service. It reads task data cross-domain through a runtime `TaskCounterProtocol` (duck-typed to the task repository's batched `get_status_counts`, injected via `AppContainer`), mirroring the existing stories→milestones Protocol pattern — never importing the concrete task service. Returns `{ story_id, total_tasks, by_status }` computed on demand (never stored); an empty story returns `{ total_tasks: 0, by_status: {} }`. Added as a stories REST route + mirrored MCP tool. -->
- `backend/app/tasks/` — Task CRUD + detail composition + on-demand dependency computation <!-- updated: 2026-07-12 (STORY-005 reconcile): full domain slice built — model (four indexes), repository (`coerce_story_id`, `get_by_id_and_story`, story-scoped paginated list with four independent filters + dialect-aware label filter, `get_status_counts` batched GROUP BY), service (parent-story existence, transitive `task→story→project` project resolution, four-dictionary validation of `type`/`status`/`assignee_role`/`creator_role`, immutable `story_id`, hard delete, detail with empty side-collections), schema, controller (two routers: create+list under `/v1/stories/:id/tasks`, get/update/delete/detail under `/v1/tasks/:id`), and six mirrored MCP tools. `GET /tasks/:id/detail` returns the task plus **empty** `links`/`attachments`/`comments` arrays until STORY-006/007/008 build those domains; `GET /tasks/:id/dependencies` remains deferred to STORY-006 (task-links). -->

- `backend/app/task_links/` — typed directed links between tasks (same **story**) <!-- updated: 2026-07-13 (STORY-006 reconcile): full domain slice built — model (two CASCADE FKs to task, uniqueness on (source, target, link_type), two directional indexes), repository (batch enrichment `get_linked_task_summaries`, `find_duplicate`, `list_for_task`/`list_all_for_task`, `delete_all_for_task`), service (five validation rules in precedence order 404→422/scope→422/self→422/dict→409/dup; `link_type` validated against the project's effective `link_types` resolved transitively `task→story→project`), schema, controller (`POST/GET /tasks/:taskId/links` + top-level `DELETE /task-links/:id`), and three mirrored MCP tools. Scope narrowed from same-project (LOCKED v1.0) to **same-story** (api-contract v1.3, ADR-017). Kept a separate package from `story_links` (not a polymorphic table) per ADR-017. -->
- `backend/app/story_links/` — typed directed links between stories (same **project**) <!-- updated: 2026-07-13 (STORY-006 reconcile): full domain slice built, mirroring `task_links` scoped to stories. Model (two CASCADE FKs to story, uniqueness + two directional indexes), repository (`delete_all_for_story`, `list_all_for_story`, batch enrichment), service (same five rules; project resolved directly from `story.project_id`; cross-project rejected), schema (`LinkedStorySummary.status` is nullable — BUG-001 fix), controller (`POST/GET /stories/:storyId/links` + top-level `DELETE /story-links/:id`), three mirrored MCP tools. Net-new surface added to api-contract v1.3. -->
  - `GET /tasks/:id/dependencies` remains **deferred/unbuilt**; the contract keeps it as forward spec. STORY-006 populated `TaskDetail.links` and added `StoryDetail.links` instead.
- `backend/app/attachments/` — document/image/file/external-ref attachments; filesystem-backed <!-- updated: 2026-07-15 (STORY-007 reconcile): full domain slice built — model (polymorphic FK-less `container_id`, ADR-020), repository (per-container filtered/paginated list + cascade-removal query set), service (single create path for all four kinds; container existence via three reader Protocols; per-kind MIME allow-list + 10 MB guard before any bytes written; immutable — no update/archive; hard delete removes row + file), schema, controller (create negotiates JSON vs multipart — the codebase's first content-negotiating route), and seven MCP tools (create for all four kinds incl. base64 binary upload; `get_attachment_file` base64 read). One immutable file per attachment (ADR-021); create + delete only, delete works for every kind; `file` kind = opaque binary with curated MIME allow-list; agents upload/read binary over MCP as base64; `author_role` stored on the attachment. Cross-domain: an `AttachmentReaderProtocol` (declared in the attachments service, injected into story/task/milestone services) drives application-level cascade delete (rows + files) and detail composition. `GET /milestones/:id/detail` built here for the first time. Migration `0009_attachment` (down: `0008_link_types_structured`). --> <!-- updated: 2026-07-15 (STORY-021 reconcile): the dictionary-bound `type` field is replaced by a mandatory free-form `title` (1–500 chars, **not dictionary-validated**) across the entity, all create schemas, service, controller, MCP tools, and the response. The service dropped its `attachment_types` dictionary resolution, the type-allowed check, and the `EffectiveDictionary` reader it held only for that purpose — `_resolve_container` now returns just the container UUID (removed a redundant `task→story→project` lookup that only fed the retired check). A `_assert_title_not_empty` backstop is kept in the service. Missing/empty/whitespace `title` → 422 on every path; on the multipart path only, an *absent* title defaults to the uploaded file name truncated to 500 chars while a *present-but-empty* one is still rejected 422. The attachment list dropped the `type` filter (repository predicate + REST query param + MCP tool arg); `kind` filtering is unchanged. Migration `0010_attachment_title` (down: `0009_attachment`). Spec-mandated refinement — no ADR. -->
- `backend/app/comments/` — Markdown comments on stories/tasks/milestones + reply lineage <!-- updated: 2026-07-21 (STORY-008 reconcile): full domain slice built, structurally mirroring `attachments` — model (polymorphic FK-less `container_id`; required-immutable `author_role`; free-form `labels`; an immutable, root-first **materialized `ancestors` id-path** for replies — ADR-023; composite `(container_type, container_id, created_at)` index), repository (newest-first paginated list with `label_key`/`label_value`/`after_id` watermark/`descendant_of` sub-thread filters; `list_by_ids` ordered fetch; cascade pair), service (create validation precedence container-404→content-422→author_role-422→in_reply_to-404→same-container-422; `ancestors = parent.ancestors + [parent.id]`; content-only/labels-only update with `author_role`/`ancestors` immutable; `get_ancestors` up-traversal; container reader Protocols + a `CommentReaderProtocol`), JSON-only controller (container-scoped create/list + top-level get/ancestors/update/delete) and six behavior-identical MCP tools. A new shared `apply_json_scalar_array_contains_filter` helper in `core.database` backs the `ancestors`-contains filter. Migrations `0011_comment` (table) and `0012_web_ui_role_backfill` (settings backfill — see Seed data). Newest-first list ordering was flipped from the initially-built oldest-first (TASK-012, a product decision, no ADR). -->
  - A **reply** is an ordinary flat comment carrying the parent's lineage in `ancestors`; there is no thread/parent-child table and no nesting in presentation. The create-time input `in_reply_to` (one comment id) is request-only — validated then reflected solely through the computed `ancestors` — and is never stored or returned. `content` is stored verbatim (no server-side link prefixing). See ADR-023 and the Known Divergences note on the description's schema-free reply prescription.
- `backend/app/sessions/` — session records + incomplete-session query
- `backend/app/milestones/` — milestones (single owning project) + lifecycle status + story assignment <!-- updated: 2026-07-11 (STORY-012 reconcile): full domain slice built — model, repository (`get_active_for_project`, `get_story_counts` batched GROUP BY, `clear_story_links`), service (single-project ownership, name uniqueness, atomic activate/finish per ADR-016), schema, REST controller, and mirrored MCP tools. Single-project ownership + lifecycle (planned/active/finished) supersedes the M:N project-association design; see api-contract v1.2, ADR-015, ADR-016. `GET /milestones/:id/detail` (attachments+comments composition) is deferred until STORY-007/008 build those domains — see Known Divergences. -->
- `backend/app/settings/` — system + project dictionaries; effective-dictionary resolution <!-- updated: 2026-07-13 (STORY-020 reconcile): `link_types` is now a structured dictionary — schema exposes a `LinkTypeEntry {value, outbound, inbound}` model; the service branches on the `link_types` key for structured validation (non-empty 1–200 fields, unique `value`) and serialization, while `resolve()` extracts `value` strings to preserve the `EffectiveDictionary` Protocol for link validation. The other five keys stay plain-string arrays. See ADR-019. -->
- `backend/app/api/` — resolving and uniting separate routers, managing API versions, starting from V1, a lightweight component
- `backend/app/mcp/` — resolving mcp protocol
- `backend/migrations/` — Alembic migration scripts

### Frontend — feature-based decomposition

> Internal organization owned by frontend-developer; recorded here at folder-boundary level only.

- `frontend/src/app/` — application composition root and layout shells: providers, router, query client, and the three nested layout shells (`RootLayout`, `AppShell`, `ProjectShell`) plus the top-bar/sidebar/redirect components and the always-mounted overlay host <!-- updated: 2026-07-22 (STORY-022 reconcile): `RootLayout` now owns the overlay-stack state and mounts `OverlayHost` over the route outlet; `TopBar`'s Projects/Config entries are overlay triggers, not route links. The Revision-2 navigation apparatus (`navigationModel`, `useLastMainViewUrl`, `useLastVisitedUrl`) and the routed `ProjectsPage`/`SettingsPage`/`ProjectSettingsPage` were deleted — see ADR-025. -->
- `frontend/src/features/` — one folder per feature/screen (projects, stories, board, settings, tasks, task-links, story-links, milestones, and lazy-loaded placeholders for attachments, comments, sessions, cross-project) <!-- updated: 2026-07-13 (STORY-006 reconcile): task-links and story-links are now live. Task links render in the Task Detail Modal (features/tasks/), story links in the Story slide-over right panel (features/story-links/). Each has an endpoints module, TanStack Query hooks (list + create/delete mutations invalidating the link list and the parent detail), a section component, an add-link form, a row, and a delete-confirm dialog. STORY-018 added `src/shared/utils/linkLabels.ts` — `getLinkLabel(linkType, direction)` maps the raw slug to a direction-aware human label (fallback: raw slug). STORY-019 added `getLinkOptions(linkTypes)` expanding each key into an outbound+inbound picker option; the Add-link forms show all directional options and swap source/target before the create call when an inbound option is picked (direction is expressed purely by which item is source vs target — the API has no direction field on create). -->
- `frontend/src/shared/utils/linkLabels.ts` — shared link-label utility consumed by both task-links and story-links (direction-aware badge labels + directional picker options). <!-- updated: 2026-07-13 (STORY-018/019 reconcile) -->
- `frontend/src/shared/` — reusable UI components, hooks, utilities
- `frontend/src/core/` — REST client and cross-cutting client concerns
- `frontend/src/api/` — contract types, endpoint functions, path/config constants
- `frontend/src/config/` — cache-key registry and other client config

<!-- updated: 2026-07-10 (STORY-016 reconcile) --> <!-- updated: 2026-07-22 (STORY-022 reconcile) -->
**Navigation model (redesigned in STORY-016, supersedes the STORY-002 flat top-nav; Projects & Config
made state-driven overlays in STORY-022 — see ADR-014 and ADR-025):**
the shell is a **three-level nested layout hierarchy** driven by an **app switcher**, replacing the
former flat three-item top nav (Projects / Sessions / Settings). STORY-022 keeps that hierarchy but
turns **Projects management** and **system Config** into overlay panels rather than routes.

- **RootLayout** (flat root) — hosts the top bar and an **always-mounted overlay host** layered over
  the route outlet. The top bar has an app-switcher combobox (`Task Manager` / `Sessions`) on the
  left and two persistent, active-aware entries on the right — **Projects** and **Config** — present
  in **both** modes. These two are **triggers** (plain buttons), not route `NavLink`s: they open their
  overlay and show `aria-current="page"` driven by overlay state, not by route matching. Only
  `/sessions` (Sessions mode) and the project-scoped routes render in the outlet.
- **AppShell** (Task Manager mode) — renders the **collapsible project sidebar** (project combobox,
  project list with active highlight; **no** `Gestisci progetti` link — removed in STORY-022, since
  the top-bar Projects entry is now the single path to project management) beside its outlet.
  Collapsed state persists in local storage. All project-scoped routes (`/projects/:id/*`) render here.
- **ProjectShell** — renders the **three-tab** per-project **sub-navigation** (Stories, Board,
  Milestones — Settings left the tab set in STORY-022) with active-tab highlight, plus a nested
  outlet. An unknown project ID renders an inline "Not found" message linking back to `/`.

Leaf routes render in the ProjectShell outlet: Stories list (`/projects/:id/stories`), Board
(`/projects/:id/board`), and Milestones (`/projects/:id/milestones`). The **Story Detail slide-over**
is a **nested child route** of the Stories list (`/projects/:id/stories/:storyId`): it animates in
from the right over a dimmed, still-mounted list/board, so a direct visit renders the project view
with the slide-over already open; `✕`, `Escape`, and the `← Stories` breadcrumb close it to the
parent route.

**Projects and Config overlays (STORY-022, ADR-025).** Neither has a URL — the `/projects`,
`/settings`, and `/projects/:id/settings` routes were removed. An overlay host owns one overlay stack
at a time (`none` | Projects | Config), reusing the Story slide-over chrome (right-side panel, dimmed
backdrop below the top bar, slide-in animation) and registering with the shared `useModalEscape`
stack. Opening or closing an overlay changes **no route** — the main view stays mounted underneath
with its URL unchanged, so a refresh closes the overlay and lands on the main view. The **Projects**
stack has two levels (project list → a chosen project's Settings editor); **Config** has one (the
system dictionary editor). Two controls match the Story slide-over: **Back** pops one internal level
(shown only when the stack has depth beyond its root — so absent on the project list and on Config),
and **Dismiss** clears the whole stack. A project's Settings panel carries an **"Open in Task Manager"**
forward bridge that navigates the underlying main view to that project's Stories and dismisses the
overlay in one action (the single in-app path from a project's configuration surface to its work
surface; resolves BUG-006 by construction). The overlay renders **above** the Task Detail modal and
its nested dialogs, below the toast and the top bar (BUG-007). The Project Settings panel keeps the
existing project-existence / not-found handling for an unresolved id.

`/` is a redirect (`RootRedirect`) to `/projects/:lastId/stories` using the last-visited project ID
from local storage. With **no** projects at all, it stays at `/`, renders a small "No projects yet"
empty Task Manager main view, and auto-opens the Projects overlay once so the first project can be
created (there is no `/projects` route to redirect to any more). The bare `/projects/:id` still
redirects to that project's Stories, and the Task Manager sidebar's project selection still lands on
Stories — both unchanged. The app-switcher derives its mode purely from the current route (no recorded
URL); switching to Task Manager navigates to `/`.

The prior top-level nav rule still holds in spirit: the remaining domains (Tasks, Task Links,
Attachments, Comments) are sub-views reached through their parent context, not app-switcher entries.
Sessions is a distinct **app** (via the switcher), not a top-nav item.

---

## Module Relations

- `controller (REST router) → app service`: each controller calls only its app's service; never the data layer directly.
- `MCP tools → app service`: MCP tools call the same services the controllers use — one logic path, two surfaces.
- `app service → core`: services use `core` for DB sessions, dictionary resolution, storage, and error types.
- `app service → data layer`: services own all queries; the data layer (ORM models) is private to the backend.
Parent / container / reference existence:
- `stories service → projects data`: a story requires an existing parent project; the project scopes dictionary resolution.
- `tasks service → stories data`: a task requires an existing parent story; the owning project is resolved transitively (`task → story → project`).
- `task_links service → tasks data`: a link requires both source and target tasks to exist, be in the same **story**, and differ (no self-link); uniqueness on (source, target, link_type). <!-- updated: 2026-07-13 (STORY-006 reconcile): scope is same-story (api-contract v1.3); enrichment reads the task table directly through the link repository's own session (no call into the tasks service). -->
- `story_links service → stories data`: a link requires both source and target stories to exist, be in the same **project**, and differ (no self-link); uniqueness on (source, target, link_type); enrichment reads the story table directly through the link repository's own session. <!-- updated: 2026-07-13 (STORY-006 reconcile) -->
- `attachments service → stories/tasks/milestones data`: the container (`container_type`) must exist before an attachment is created.
- `comments service → stories/tasks/milestones data`: the container (`container_type`) must exist before a comment is created.
- `sessions service → stories/tasks data`: optional `linked_story_id` / `linked_task_id` are validated to exist on create/update (SET NULL when the referenced story/task is deleted).

Dictionary validation:
- `stories / tasks / task_links / story_links services → settings service`: before any dictionary-bound write, the owning project's effective dictionary is resolved and the value validated — `story_statuses` (story), `task_types` + `task_statuses` + `participant_roles` (task), `link_types` (task_link **and** story_link). Comments have no dictionary-bound fields. <!-- updated: 2026-07-13 (STORY-006 reconcile): story_links validate `link_type` against the effective dictionary too. --> <!-- updated: 2026-07-15 (STORY-021 reconcile): **attachments dropped out of this relation** — its former `attachment_types` validation is gone; the attachment `title` is free-form, so the attachments service no longer depends on the settings service at all. -->

Aggregation / composition (a service reads another app's data to assemble a derived/composed response):
- `stories service → tasks data`: story aggregation (`GET /stories/:id/aggregate`) derives per-status counts from tasks (on demand).
- `tasks service → task_links data`: task detail (`GET /tasks/:id/detail`) reads inbound+outbound enriched links; task delete clears all links referencing the task. <!-- updated: 2026-07-13 (STORY-006 reconcile): composed through a runtime-checkable `TaskLinkReaderProtocol` declared in the tasks service module (methods `list_all_enriched_for_task`, `delete_all_for_task`) and satisfied structurally by the task-link service injected via `AppContainer` — the tasks service never imports the concrete link package, so composition stays one-way (work-item → link data) with no circular import, mirroring the stories→tasks `TaskCounterProtocol` pattern. `/dependencies` remains unbuilt. -->
- `stories service → story_links data`: story detail (`GET /stories/:id/detail`) reads inbound+outbound enriched links; story delete clears all links referencing the story. <!-- updated: 2026-07-13 (STORY-006 reconcile): composed through a runtime-checkable `StoryLinkReaderProtocol` declared in the stories service module (methods `list_all_enriched_for_story`, `delete_all_for_story`), same one-way Protocol-injection pattern as tasks→task_links. -->
  - **Cascade delete is application-level, not FK-reliant.** Both delete methods call the link reader's `delete_all_for_*` before removing the parent, because `ON DELETE CASCADE` is inert on SQLite as built (see Known Divergences). Extends the milestone-delete precedent to two more cases (ADR-018).
- `tasks service → attachments data`: task detail (`GET /tasks/:id/detail`) composes the task's attachments.
- `tasks service → comments data`: task detail (`GET /tasks/:id/detail`) composes the task's comments (newest-first). <!-- updated: 2026-07-21 (STORY-008 reconcile): built — was an empty array; ordering flipped to newest-first (TASK-012). -->
  - <!-- updated: 2026-07-21 (STORY-008 reconcile) --> **Comments composition + cascade are now built for all three containers** through one `CommentReaderProtocol` (declared in the comments service, methods `list_all_for_container` / `delete_all_for_container`), injected into the story/task/milestone services alongside the `AttachmentReaderProtocol` — the same one-way work-item→data Protocol-injection pattern, no circular import. Detail composition populates each container's `comments` newest-first; delete cascade removes comment rows. Because the comment `container_id` has no FK (same polymorphic convention as attachments, ADR-020), this cascade is application-level by necessity and holds identically on both dialects.
- `stories service → attachments data` & `stories service → comments data`: story detail (`GET /stories/:id/detail`) composes the story's attachments and comments (side collections only; tasks are not included — they are board-driven via the tasks list + aggregate). Comments composed newest-first. <!-- updated: 2026-07-21 (STORY-008 reconcile): comments now populated. -->
- `milestones service → attachments data` & `milestones service → comments data`: milestone detail (`GET /milestones/:id/detail`) composes the milestone's attachments and comments (assigned stories are not included — paginated via `GET /milestones/:id/stories`). Comments composed newest-first. <!-- updated: 2026-07-21 (STORY-008 reconcile): comments now populated, closing the STORY-007 forward-spec gap. -->
  - <!-- updated: 2026-07-15 (STORY-007 reconcile) --> **Attachments composition + cascade are now built for all three containers** through one `AttachmentReaderProtocol` (declared in the attachments service, methods `list_all_for_container` / `delete_all_for_container`), injected into the story/task/milestone services — the same one-way work-item→data Protocol-injection pattern as the link readers, no circular import. Detail composition populates each container's `attachments`; delete cascade removes rows **and** files. Because the attachment `container_id` has no FK (ADR-020), this cascade is application-level by necessity, not merely as a workaround for the SQLite PRAGMA gap — it holds identically on both dialects. <!-- updated: 2026-07-21 (STORY-008 reconcile): the comments half is now built too (via the parallel `CommentReaderProtocol`), so all three detail views populate both `attachments` and `comments`; `GET /milestones/:id/detail` was built in STORY-007. -->
- `milestones service → stories data`: milestone `story_count` and `GET /milestones/:id/stories` derive/compose assigned stories (also listed under Milestones); the Board filters stories by the active milestone via `GET /stories?milestone_id=…`.

> Note: `projects` has no composition relation to `stories`. Listing a project's stories
> (`GET /projects/:projectId/stories`) is the *stories* service filtered by `project_id` (captured as
> `stories → projects`); the projects service derives nothing from stories. Project→Story containment
> is expressed by the FK + `ON DELETE CASCADE` in the schema, not by a runtime service dependency.

Milestones: <!-- updated: 2026-07-11 (STORY-012 reconcile): single-project + lifecycle model, as built -->
- `milestones service → projects data`: validates the single owning project exists and enforces name uniqueness within that project.
- `milestones service → stories data`: reads assigned stories (`story_count` via a batched `GROUP BY` over `story.milestone_id` — no per-milestone query; milestone story list); on delete, clears `milestone_id` on assigned stories via a bulk UPDATE (no story deleted).
- `stories service → milestones data`: assigning `milestone_id` validates the milestone exists (404) and belongs to the story's project (422). To avoid a circular import, the stories service depends on milestones through a runtime-checkable `MilestoneRepositoryProtocol` (duck-typed) rather than importing the concrete repository.

Storage & client:
- `attachments service → core.storage`: file read/write/delete on the attachments volume. <!-- updated: 2026-07-15 (STORY-007 reconcile): `delete` capability added to `FilesystemStorage` (TASK-001, `Path.unlink(missing_ok=True)` — no-op when the file is already absent), used for hard delete and container-cascade removal. The pre-existing `snapshot` helper remains but is unused by attachments (version history was removed — ADR-021). -->
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
2. Service loads the task, its links (enriched with linked task id/title/status), attachments (metadata only), and comments (newest-first) in one service call. <!-- updated: 2026-07-21 (STORY-008 reconcile): comments composed newest-first. -->
3. Adapter returns `{ "data": { ...task, links, attachments, comments } }`.

### File path, e.g. "attachment file"

1. Document/image/file content is written to the attachments volume by `core.storage`; the DB stores metadata + a server-internal `file_path` (never exposed). Content arrives either as REST multipart (Web UI) or as an MCP base64 argument (agents); both decode to bytes on one create path.
2. `GET /attachments/:id/file` streams the file with `Content-Type = mime_type` (browser/UI download path). Agents read bytes via the MCP `get_attachment_file` tool, which returns `{ mime_type, content_base64 }`.
3. Attachments are immutable: the file is written once at create and never overwritten — there is no update endpoint and no version history. To change content, delete the attachment and create a new one (there is no archive; delete works for every kind). <!-- updated: 2026-07-15 (STORY-007 reconcile): built as designed — version history and the `PUT` update endpoint are absent; one file per attachment, create + delete only (no archive); `file` kind + MCP base64 read/create shipped. See ADR-021 (immutability, supersedes ADR-005 versioning). -->

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
- **task** — `id`, `story_id` (FK→story, CASCADE), `title`, `content`, `type`, `status`, `assignee_role`, `creator_role`, `labels` (JSON array), `created_at`, `updated_at` <!-- updated: 2026-07-12 (STORY-005 reconcile): built by `0005_task` (down: `0004_milestone`) — an append to the chain with an **inline** FK to `story.id ON DELETE CASCADE` and the four task indexes, per ADR-010 (root-first, inline-FK toward an already-existing parent). The initial-chain assumption in the STORY-005 plan (task table pre-existing) did not hold; a dedicated revision was added instead, consistent with the established migration pattern. -->

- **task_link** — `id`, `source_task_id` (FK→task, CASCADE), `target_task_id` (FK→task, CASCADE), `link_type` (validated vs effective `link_types`); unique (`source_task_id`, `target_task_id`, `link_type`); `target ≠ source`; both tasks in the **same story** <!-- updated: 2026-07-13 (STORY-006 reconcile): built by `0006_task_link` (down: `0005_task`), inline `ON DELETE CASCADE` FKs to `task.id`. Scope narrowed to same-story (api-contract v1.3). -->
- **story_link** — `id`, `source_story_id` (FK→story, CASCADE), `target_story_id` (FK→story, CASCADE), `link_type` (validated vs effective `link_types`); unique (`source_story_id`, `target_story_id`, `link_type`); `target ≠ source`; both stories in the **same project** <!-- updated: 2026-07-13 (STORY-006 reconcile): built by `0007_story_link` (down: `0006_task_link`), inline `ON DELETE CASCADE` FKs to `story.id`. Net-new table. -->
  - Each link table has two directional indexes: `(source_*_id, link_type)` and `(target_*_id, link_type)`.
- **attachment** — `id`, `container_type` (story|task|milestone), `container_id` (**polymorphic, no FK** — ADR-020), `title` (mandatory, free-form, max 500), `kind` (document|image|file|external-ref), `mime_type` (cond. — document/image/file), `file_size_bytes` (cond. — document/image/file), `file_path` (internal, never exposed), `external_url` (cond.), `external_status`, `author_role` (optional, descriptive), `created_at`, `updated_at` <!-- updated: 2026-07-15 (STORY-007 reconcile): built by `0009_attachment` (down: `0008_link_types_structured`) with no seed. `container_id` is a plain column with no FK (polymorphic across story/task/milestone — ADR-020); container existence + cascade are application-level. No version history (one immutable stored file per attachment; no update endpoint; no `attachment_version` table — ADR-021); `file` kind (opaque binary, curated MIME allow-list); MCP `get_attachment_file` reads + base64 create tools upload binary; no archive (no `archived_at`) — create + delete only, delete works for every kind; `author_role` on the attachment entity. --> <!-- updated: 2026-07-15 (STORY-021 reconcile): the dictionary-bound `type` column was replaced by a mandatory free-form `title` (`String(500)`, NOT NULL, not dictionary-validated); `title` is set once at create (immutable, like every other attachment field). The container list index was swapped from `(container_type, container_id, type)` to `(container_type, container_id, kind)` (`ix_attachment_container_type` → `ix_attachment_container_kind`). Migration `0010_attachment_title` (down: `0009_attachment`). -->
- **comment** — `id`, `container_type` (story|task|milestone), `container_id` (**polymorphic, no FK** — same convention as attachment, ADR-020), `author_role` (required, immutable), `content` (Markdown, 1–50,000, validated at the schema layer), `labels` (JSON array, free-form), `ancestors` (JSON array of ancestor comment ids, root-first, immutable — the materialized reply path, ADR-023), `created_at`, `updated_at` <!-- updated: 2026-07-21 (STORY-008 reconcile): built by `0011_comment` (down: `0010_attachment_title`) with no seed. `container_id` and the `ancestors` ids are FK-less; container existence + cascade are application-level. Composite index `ix_comment_container_created` on `(container_type, container_id, created_at)` backs the (newest-first) list. No dictionary-bound fields — `author_role` and `labels` are free-form. -->
  - One index: `ix_comment_container_created` `(container_type, container_id, created_at)` — serves the container-scoped list in either direction (the list `ORDER BY (created_at, id) DESC` is newest-first as built; the id tiebreaker keeps it stable when timestamps collide).
- **session** — `id`, `topic`, `context`, `result_decisions`, `result_summary`, `status` (free-form), `participant_role`, `linked_story_id` (FK→story, SET NULL), `linked_task_id` (FK→task, SET NULL), `archived_at`, `created_at`, `updated_at`
- **system_settings** — `key` (PK, one of the settings keys), `values` (JSON, per-key shape), `updated_at` <!-- updated: 2026-07-13 (STORY-020 reconcile): `values` is now a **heterogeneous** JSON column — for `link_types` it holds structured objects `{value, outbound, inbound}`; for the other four keys it stays a plain-string array. See ADR-019. --> <!-- updated: 2026-07-15 (STORY-021 reconcile): `attachment_types` retired — five dictionary keys. --> <!-- updated: 2026-07-21 (STORY-008 reconcile): a **sixth, scalar key** `default_web_ui_role` (ADR-022) is added — its `values` cell holds a **bare JSON string**, not an array, the only row shaped that way. The ORM `values` type hint was widened from `Mapped[list[Any]]` to `Mapped[Any]` to carry the scalar alongside the list shapes (Python-side hint only, no DDL change). Keys are now five dictionaries + one scalar. -->
  - **Settings keys at `head`:** five dictionaries (`task_statuses`, `task_types`, `story_statuses`, `link_types`, `participant_roles`) + one scalar (`default_web_ui_role`). The scalar is validated on write against the effective `participant_roles` for its scope (422 otherwise); it never re-validates on read and never constrains a comment's free-form `author_role`.
- **project_settings** — composite PK (`project_id` FK→project CASCADE, `key`), `values` (JSON array, ≥1 — fully replaces system default; replace-never-merge per ADR-008), `updated_at` <!-- updated: 2026-07-13 (STORY-020 reconcile): same heterogeneous `values` shape as system_settings — a `link_types` override stores structured objects. -->
- **link_types dictionary shape** (STORY-020, ADR-019): the `link_types` dictionary is the sole structured dictionary. Each entry is `{value, outbound, inbound}` — `value` is the machine key stored on `task_link.link_type` / `story_link.link_type`; `outbound`/`inbound` are the directional display labels. Link-type validation resolves the effective `link_types` down to the set of `value` strings (via `EffectiveDictionary.resolve()` which keeps its `list[str]` contract), so TaskLink/StoryLink validation is unchanged. Structured objects are exposed only through the settings response schemas, not through the resolution Protocol.
- **milestone** — `id`, `project_id` (FK→project, CASCADE), `name` (unique within its project, case-insensitive, 1–200), `description`, `status` (`planned`|`active`|`finished`, DDL `server_default 'planned'`), `created_at`, `updated_at` <!-- updated: 2026-07-11 (STORY-012 reconcile): built by `0004_milestone`. Single owning project (non-null FK) + lifecycle status replace the former M:N `milestone_project` join (ADR-015). At most one `active` per project — enforced by the service in the same transaction as activate, not by a DB constraint (ADR-016). -->
  - Three indexes: `ix_milestone_project_id` `(project_id)`, `ix_milestone_project_status` `(project_id, status)`, and `ix_milestone_project_name_lower` `(project_id, LOWER(name))` unique (case-insensitive name uniqueness within a project).

### Relations & cascade

Project → Story → Task all CASCADE; Story/Task/Milestone → Attachment/Comment CASCADE (**application-level for both Attachment and Comment** — polymorphic FK-less container, STORY-007/STORY-008, ADR-020); Task → TaskLink CASCADE (either side); Story → StoryLink CASCADE (either side); Session → Story/Task SET NULL; Project → Milestone CASCADE; Story → Milestone SET NULL. <!-- updated: 2026-07-21 (STORY-008 reconcile): Comment cascade is application-level (its container_id has no FK), mirroring Attachment — the story/task/milestone service delete calls the comment reader's `delete_all_for_container` before removing the parent, so no orphan comments remain on either dialect. --> <!-- updated: 2026-07-11 (STORY-012 reconcile): Milestone belongs to one Project (Project → Milestone CASCADE), replacing the Milestone ↔ Project M:N join (ADR-015). --> <!-- updated: 2026-07-13 (STORY-006 reconcile): Task → TaskLink and Story → StoryLink CASCADE declared on both FK sides; but see the SQLite FK gap below — link cleanup is done application-side in the tasks/stories service delete so no orphans remain on either dialect (ADR-018). -->
- **`0004_milestone` (STORY-012) also adds the deferred `story.milestone_id` FK** (`ON DELETE SET NULL`) at the point the `milestone` table is created, resolving ADR-013. On SQLite this uses `batch_alter_table` (table rebuild, constraint named `fk_story_milestone_id`) since SQLite cannot `ALTER TABLE ADD CONSTRAINT`; on PostgreSQL it emits a plain `ADD CONSTRAINT`. Verified portable on both dialects.
- **Cascade/SET NULL is not FK-enforced under SQLite as built** — `PRAGMA foreign_keys = ON` is not set on the SQLite connection, so `ON DELETE CASCADE` and `ON DELETE SET NULL` are inert on SQLite (they are enforced on PostgreSQL). Application-level clearing covers the milestone case: milestone delete explicitly bulk-clears `story.milestone_id` in the service, so deleting a milestone works correctly regardless of dialect. See Known Divergences.

### Indexes

As specified in the backend requirements: story `(project_id, created_at DESC)` and `(project_id, status)` and `(milestone_id)`; task `(story_id, status)`, `(story_id, type)`, `(assignee_role)`, `(creator_role)`; task_link `(source_task_id, link_type)` and `(target_task_id, link_type)`; story_link `(source_story_id, link_type)` and `(target_story_id, link_type)` <!-- updated: 2026-07-13 (STORY-006 reconcile) -->; attachment `(container_type, container_id, kind)` <!-- updated: 2026-07-15 (STORY-021 reconcile): swapped from `…, type)` to `…, kind)` when `type` was replaced by the un-indexed free-form `title` -->; comment `(container_type, container_id, created_at)` (`ix_comment_container_created`; scanned descending for the newest-first list) <!-- updated: 2026-07-21 (STORY-008 reconcile) -->; session `(archived_at, result_decisions)`, `(linked_story_id)`, `(linked_task_id)`; milestone `(project_id)`, `(project_id, status)`, and unique `(project_id, LOWER(name))`. <!-- updated: 2026-07-11 (STORY-012 reconcile): milestone indexes as built by `0004_milestone`; the functional unique `LOWER(name)` index enforces case-insensitive name uniqueness within a project. -->

### Portability constraints (SQLite ⇄ PostgreSQL)

- **UUID** — portable UUID type: native `uuid` on Postgres, `CHAR(36)` string on SQLite.
- **labels (JSON array)** — JSON type mapping to `jsonb` (Postgres) / `JSON` text (SQLite). Filtering by `label_key`/`label_value` is dialect-aware inside the data layer (`json_each` + `json_extract` on SQLite; `jsonb_array_elements` + `@>` containment on Postgres, each in an `EXISTS` subquery). Services and controllers see one neutral `label_key`/`label_value` interface. <!-- updated: 2026-07-07 (STORY-004 reconcile): implemented and proven portable in the story repository — first JSON-array filter in the codebase; reusable by tasks/comments. Dialect detected via `session.get_bind().dialect.name`. See ADR-012. -->
  - A `label_key` no story carries yields an empty page (never an error); `label_key` and `label_value` narrow independently. JSON-array filters are not B-tree indexable — acceptable at the ≤1,000-row list scale.
- **Case-insensitive uniqueness** (project/milestone name) implemented dialect-aware (e.g. `LOWER()` functional uniqueness).
- **Concurrency** — SQLite runs in WAL mode to allow concurrent reads under the ≥5-request concurrency requirement.
- **Migrations** — Alembic scripts avoid dialect-only DDL; branch only where unavoidable. <!-- updated: 2026-07-06 (STORY-003 reconcile) --> The chain is authored in **dependency order, root-table-first**: `project` is the first revision (`0001_project`, down: None), children come after, and every FK is declared **inline** toward an already-existing parent (no deferred FK, no `batch_alter_table`). Each schema revision **bundles its own seed** in the same `upgrade()`. See ADR-010. The functional `LOWER(name)` unique index is created via `op.create_index(..., sa.text("LOWER(name)"))` in the migration (not `__table_args__`), for portable reflection across dialects. <!-- updated: 2026-07-07 (STORY-004 reconcile): `0003_story` (down: `0002_settings`) creates the `story` table with an inline `project_id` FK and three indexes. The one exception to inline-FK-toward-existing-parent is `story.milestone_id`: it ships as an FK-less column because its parent `milestone` table is created only in STORY-012, which adds the FK then (portably; SQLite needs `batch_alter_table`). See ADR-013. --> <!-- updated: 2026-07-13 (STORY-006 reconcile): `0006_task_link` (down: `0005_task`) and `0007_story_link` (down: `0006_task_link`) each create one link table with inline `ON DELETE CASCADE` FKs toward the already-existing parent (`task`/`story`), the (source, target, link_type) uniqueness index, and two directional indexes — consistent with the root-first inline-FK pattern (ADR-010). Two separate revisions, one per link domain (matching the two-package structure of ADR-017), rather than a single bundled revision. --> <!-- updated: 2026-07-13 (STORY-020 reconcile): `0008_link_types_structured` (down: `0007_story_link`) is a **data migration** (no DDL) — it rewrites the `link_types` rows in `system_settings` and `project_settings` from flat strings to structured objects and reverses cleanly. It is idempotent (already-structured entries are left unchanged) and no-ops on a fresh DB. Raw SQL via `sa.text()` (not `sa.table()`/`sa.column()`) because `values` is a reserved word / clashes with SQLAlchemy's `ColumnCollection.values`; ANSI-quoted `"values"` is portable across both dialects. --> <!-- updated: 2026-07-15 (STORY-007 reconcile): `0009_attachment` (down: `0008_link_types_structured`) creates the `attachment` table with portable `String(36)` id/`container_id` DDL and, per ADR-020, **no `ForeignKeyConstraint` on `container_id`** (polymorphic — one column cannot reference three tables), plus the `(container_type, container_id, type)` index and no seed. Round-trips cleanly on both dialects. --> <!-- updated: 2026-07-15 (STORY-021 reconcile): `0010_attachment_title` (down: `0009_attachment`) is the **first schema migration that alters an existing populated table** rather than creating a new one. It adds `title` (nullable), backfills `title = type` for every existing row via raw SQL, tightens `title` to `NOT NULL`, drops `type`, and swaps the container index from `type` to `kind` — the add/alter/drop sequence is wrapped in `batch_alter_table` for SQLite table-rebuild portability (same pattern as `0004_milestone`; first use of `drop_column` in the chain). It also deletes the `attachment_types` rows from `system_settings` + `project_settings` at the DB layer (the immutable `0002_settings` still seeds them on a fresh install; this revision deletes what it seeded — net effect at `head` is five dictionaries). Downgrade fully reverses the schema (re-adds `type` backfilled from `title` truncated to 100 chars, restores the index) and re-seeds the system-level `attachment_types` default row; project-level `attachment_types` overrides deleted on upgrade are unrecoverable (documented in the migration docstring). Also registered the previously-missing `Attachment` model import in `migrations/env.py`. Runs unchanged on SQLite and PostgreSQL. --> <!-- updated: 2026-07-21 (STORY-008 reconcile): `0011_comment` (down: `0010_attachment_title`) creates the `comment` table — portable `String(36)` id/`container_id`, no FK on `container_id` (polymorphic, ADR-020), the composite `(container_type, container_id, created_at)` index, no seed. `0012_web_ui_role_backfill` (down: `0011_comment`) is a **data-only backfill** (no DDL) for the `default_web_ui_role`/`operator` seed — idempotent, no-ops on a fresh DB, reversible downgrade; it exists because `0002_settings`'s in-place edit could not reach an already-migrated DB (BUG-001), the one departure from the ADR-010 bundled-seed convention. Revision id kept ≤32 chars for PostgreSQL's `alembic_version.version_num` (BUG-004). -->

  - **UUID DDL:** migration DDL declares UUID columns as `String(36)` (portable across both dialects); the dialect abstraction (`UUIDType`) lives in the ORM layer, not in the migration.

### Seed data

<!-- updated: 2026-07-06 (STORY-003 reconcile): ADR-010 supersedes ADR-009 — seed is now bundled into the same revision as its schema, not a separate seed-only migration. -->
Seed data is bundled into the schema revision that creates the table it populates (ADR-010). The
chain is two revisions: `0001_project` creates the `project` table and seeds one "Test Project" row
(fixed UUID `00000000-0000-0000-0000-000000000001`, deterministic timestamps); `0002_settings`
creates `system_settings` + `project_settings` (inline `project_settings → project` FK,
`ON DELETE CASCADE`) and seeds the dictionaries in the same `upgrade()`. `system_settings` is
therefore populated at install with no runtime bootstrap. <!-- updated: 2026-07-15 (STORY-021 reconcile): `0002_settings` (immutable) still seeds **six** dictionaries on a fresh install, but `0010_attachment_title` deletes the `attachment_types` rows immediately after, so a DB at `head` carries the **five** dictionaries below — `attachment_types` is retired (its sole consumer, the attachment `type` field, is gone). --> The dictionaries at `head`:

- `task_statuses`: `["todo", "in-progress", "done"]`
- `task_types`: `["task", "bug", "testing-task"]`
- `story_statuses`: `["planned", "in-progress", "pending-approval", "accepted"]`
- `link_types` (structured since STORY-020): five entries seeded by `0002_settings` — `{value: "depends-on", outbound: "depends on", inbound: "dependent"}`, `{value: "dependent", outbound: "dependent", inbound: "depends on"}`, `{value: "created-by", outbound: "created by", inbound: "creates"}`, `{value: "creates", outbound: "creates", inbound: "created by"}`, `{value: "context", outbound: "context", inbound: "context"}` <!-- updated: 2026-07-13 (STORY-020 reconcile): `link_types` seed replaced flat strings `["depends-on", "context"]` with five structured entries. `context` retained (symmetric). Migration `0008_link_types_structured` converts existing flat-string rows in both settings tables to structured objects (canonical labels for known slugs, best-effort hyphen→space for custom slugs); downgrade collapses back to `value` strings. -->

- `participant_roles`: `["orchestrator", "architect", "backend-developer", "frontend-developer", "devops", "spec-writer", "qa-automation", "manual-qa", "operator"]` <!-- updated: 2026-07-21 (STORY-008 reconcile): `"operator"` added — the human orchestrator driving the Web UI, distinct from the `orchestrator` agent role. As an ordinary dictionary entry it is selectable anywhere `participant_roles` is used (task `assignee_role`/`creator_role`, mentions, the Default Web UI role dropdown). See ADR-024. -->
- `default_web_ui_role` (scalar, STORY-008): `"operator"` — the single value the Web UI pre-fills into a new comment's `author_role`. Stored as a bare JSON string, not a list. See ADR-022.

<!-- updated: 2026-07-21 (STORY-008 reconcile): how the STORY-008 seed reached `head`. `0002_settings` is immutable but was edited **in place** by TASK-005 on the stated pre-production/clean-install assumption (adds `"operator"` + the `default_web_ui_role` row). That assumption did not hold — a database predating the edit existed (BUG-001), where Alembic never re-runs an already-applied revision, so `GET /system/settings` 500'd (`KeyError`) and the Add Comment pre-fill broke. Fixed by `0012_web_ui_role_backfill` — an additive, idempotent, data-only migration (down: `0011_comment`) that backfills the system `default_web_ui_role` row and adds `"operator"` to the system `participant_roles` row on any DB where they are absent, and no-ops on a fresh/already-seeded DB. System-level only (no project-override backfill). `SettingsResponse.from_dict` was also hardened to read the scalar via `.get(key, "")` (defence-in-depth). This is the exception to the ADR-010 "seed bundled in its schema revision, never a separate seed migration" convention — a real post-deploy backfill was unavoidable once a live DB existed; the convention holds for greenfield tables. (`0012` was briefly named `0012_default_web_ui_role_backfill` — 33 chars — which overflowed PostgreSQL's default `alembic_version.version_num VARCHAR(32)`; renamed to the 25-char id, BUG-004.) -->

The `comment` table (`0011_comment`) ships no seed data.

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
  drag-and-drop uses optimistic updates that roll back on failure. <!-- updated: 2026-07-10 (STORY-016 reconcile): the **Board** drags **stories** between status columns via `PUT /v1/stories/:id` (optimistic cache update, rollback on error; columns derived from the project's effective `story_statuses` dictionary, never hardcoded). The task-level Kanban that drags tasks via `PUT /tasks/:id` is still deferred to STORY-005; the slide-over renders a task-kanban placeholder only. --> <!-- updated: 2026-07-12 (STORY-005 reconcile): the task-level Kanban is now live inside the Story Detail slide-over, replacing the placeholder. It drags tasks between effective-`task_statuses` columns (never hardcoded) via `PUT /tasks/:id` with the same optimistic-update/rollback shape as the Board. The Board's drag hook was promoted to a shared kanban-drag hook in `src/shared/hooks/`; the Board re-exports it from there (mechanical move, no behavior change) and the tasks feature consumes it — the two kanbans share only the drag mechanic, not their column/card structure. A card dropped on a status removed from the dictionary after load shows an inline error and snaps back. Every task create/update/delete invalidates both the per-story aggregate and the stories-list aggregate so the "N/M done" counters stay in lockstep. The Task Detail modal is a nested route child of the `:storyId` slide-over (via `<Outlet />`), staying mounted+dimmed behind the modal. -->
- **Local UI state** is persisted in browser local storage via a shared `useLocalStorage` hook. <!-- updated: 2026-07-10 (STORY-016 reconcile) --> <!-- updated: 2026-07-22 (STORY-022 reconcile): the exact-last-Task-Manager-URL memory (`useLastVisitedUrl` / `LAST_TASK_MANAGER_URL_KEY`) was removed with the Revision-2 apparatus — switching to Task Manager now navigates to `/`, which `RootRedirect` resolves via the still-present last-visited **project ID**. The **overlay** stack (Projects/Config open state) is in-memory client state owned by `RootLayout`, **not** persisted — a refresh closes it. --> Three persisted consumers remain: the sidebar collapsed/expanded state (global), the last-visited project ID (drives the `/` redirect and the Task-Manager app-switch landing), and the story-detail right-panel open/closed state (persisted **per story**, keyed by story ID).
- The frontend holds **no business logic** — all validation and dictionary rules are server-side;
  the UI only mirrors them for UX (e.g. populating dropdowns from `GET /projects/:id/settings/effective`).
- **Layered-modal keyboard coordination is centralized** in two shared hooks (in `frontend/src/shared/hooks/`), added while stabilizing the attachment viewer (STORY-007 bug fixes). <!-- updated: 2026-07-15 (STORY-007 reconcile) --> A single **modal-stack Escape** hook (`useModalEscape`) owns one shared `document` capture-phase key listener and a mount-ordered stack: each open modal/panel pushes an entry and pops it on unmount, and a given Escape press resolves to the **topmost** entry only. The attachment viewer, Task Detail modal, Story slide-over, and the STORY-022 Projects/Config overlay all consume it, so no modal reasons about capture/bubble phase or registration order relative to any other — nested stacks (viewer inside Task Detail modal inside Story slide-over, or the Projects/Config overlay layered over any of them) close one level per press and compose correctly. <!-- updated: 2026-07-22 (STORY-022 reconcile): the overlay host registers with this same stack, so Escape pops the overlay before the surfaces beneath it. -->
  <!-- updated: 2026-07-22 (STORY-022 reconcile) --> The Projects/Config **overlay** (ADR-025) is a state-driven slide-over layered over the always-mounted main-view outlet, reusing the Story slide-over chrome and this Escape stack; its open/closed state is in-memory (owned by `RootLayout`), it has no route, and it renders above the Task Detail modal and its nested dialogs but below the toast and top bar. A separate **focus-trap** hook (`useFocusTrap`) moves focus into a dialog on open, cycles Tab/Shift+Tab within it (recomputed live), and restores focus to the trigger on close. This supersedes the earlier per-modal Escape handlers, which could not generalize past two layers (the mount-order race that caused the STORY-007 viewer/modal cascade bugs).

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
- `ATTACHMENTS_DIR` — server-managed directory (Docker volume) for attachment files; outside the web root; paths never constructed from user input.

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

- **`GET /milestones/:id/detail` — FULLY RESOLVED (attachments STORY-007, comments STORY-008).** <!-- updated: 2026-07-21 (STORY-008 reconcile) -->
  Previously deferred (the attachments/comments domains did not exist). STORY-007 built the endpoint
  and composed `attachments`; STORY-008 now composes `comments` (newest-first) via the injected
  `CommentReaderProtocol`, closing the remaining half. All three detail views (story/task/milestone)
  populate both side collections; no comment array is a forward-spec placeholder any longer.

- **Comments — as-built diverges from `description.md`'s reply/ordering wording (STORY-008).** <!-- updated: 2026-07-21 (STORY-008 reconcile) -->
  The behavioral intent shipped intact, but three areas of the story's `description.md` prescribe a
  *mechanism* the architect deliberately overrode, or state a direction the product owner later
  reversed. The `api-contract.md` (v1.7) and this document reflect the **as-built** behavior; the
  stale `description.md` acceptance-criteria wording is flagged here for the **spec-writer** to
  reconcile (architect does not edit `description.md`):
  1. **Replies use a persisted, immutable materialized `ancestors` id-path (ADR-023), not the
     description's schema-free "prepend a Markdown link to `content`, never store anything" model.**
     `in_reply_to` is a request-only input; the reply relationship *is* persisted (as `ancestors`)
     and *is* returned, while `content` is stored verbatim. The flat, unthreaded presentation and
     agent reply-parity the description asks for are preserved. Description ACs referencing
     "never persisted / never in the response body" and "prepends the reply link to `content`" are
     stale.
  2. **List/detail ordering is newest-first, not oldest-first.** The product owner reversed the
     direction after the initial oldest-first build (TASK-012/013/014). Description ACs and UI/UX
     text saying "oldest first" / "appears at the bottom" / "form pinned at the bottom" are stale
     (the form is now at the top; new comments appear at the top). `after_id` keeps its keyset
     meaning; `GET /comments/:id/ancestors` stays root-first (a lineage path, not a chronological
     list) — correct and unchanged.
  3. **A standalone permalink to a *hard-deleted* comment cannot "navigate to the host view."**
     Comments have no archive/tombstone, so `GET /comments/:id` for a deleted id is a plain 404 with
     no container info — nothing survives to resolve a host from. As built, the resolver shows a calm
     `role="status"` "no longer available" message with a link home (no crash, not styled as an
     error). The reply-prefix-to-a-deleted-ancestor case *within a loaded thread* degrades to plain
     text (the container is already known). The description AC assuming host info survives the delete
     is unsatisfiable and is flagged for spec-writer to reword to the shipped graceful fallback.

- **SQLite FK actions (`CASCADE`/`SET NULL`) are inert as built.** <!-- updated: 2026-07-11 (STORY-012 reconcile) -->
  The SQLite connection does not enable `PRAGMA foreign_keys = ON` (neither `build_engine()` nor the
  test `conftest.py` sets it), so every `ON DELETE CASCADE` / `ON DELETE SET NULL` declared in the
  schema is **not enforced by SQLite at runtime or in tests**; on PostgreSQL they are enforced. This is
  a pre-existing, cross-domain gap surfaced (not introduced) by STORY-012's cascade tests. For
  milestones specifically it is benign: milestone delete clears `story.milestone_id` in the service via
  an explicit bulk UPDATE, so the "delete milestone → stories keep, link cleared" behaviour holds on
  both dialects. The exposure is elsewhere (e.g. deleting a project relies on cascade to remove child
  rows on SQLite).
  - **STORY-005 adds the story→task `ON DELETE CASCADE`** (declared inline in `0005_task`). The
    "delete story removes its tasks" acceptance criterion is guaranteed on PostgreSQL but **inert on
    SQLite** under this same gap — no app-level cascade was added to paper over it (per the plan). The
    qa-automation task marks the cascade-delete test `xfail(strict=True)`, matching the existing stories
    pattern; both xfail markers must be removed once the `PRAGMA foreign_keys = ON` fix lands. This is
    the same single resolution path below, not a new one.
  - **STORY-006 links are cleaned up application-side, so they are NOT affected by this gap.** <!-- updated: 2026-07-13 (STORY-006 reconcile) -->
    `task_link`/`story_link` declare `ON DELETE CASCADE` on both FK sides (defence-in-depth for
    PostgreSQL and the eventual PRAGMA fix), but the tasks/stories service `delete` explicitly calls
    the link reader's `delete_all_for_*` before removing the parent. The "no orphaned link records"
    acceptance criterion therefore holds on **both** SQLite and PostgreSQL without relying on the FK —
    the milestone-delete precedent applied to two more cases (ADR-018). This is the same pattern the
    resolution path below reinforces, not a new exposure.
  - **Resolution path (out of architect reconcile scope — needs a follow-up):** add a SQLite
    `connect` event that issues `PRAGMA foreign_keys = ON` in `build_engine()` and mirror it in the
    test engine setup, then restore the cascade tests that were downgraded to weaker contract checks in
    STORY-012's qa-automation task. Tracked here; not fixed during this documentation reconcile.


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
  <!-- updated: 2026-07-21 (STORY-008 reconcile): the new scalar `default_web_ui_role` key inherits
  this gap unchanged — its "Clear override" control is wired identically to the five dictionaries and
  fails the same way; the only end-to-end coverage of clear-override (any key) is via the MCP
  `clear_project_setting` tool. STORY-008 does not close the gap. -->
  - **Resolution path (out of architect reconcile scope — needs a follow-up):** this requires a
    contract revision off LOCKED v1.0 to add an explicit clear operation (recommended: `DELETE
    /projects/:projectId/settings/:key` → `204 | 404`, mirroring the existing service method and the
    frontend's current call), plus a backend REST route + MCP tool to expose `clear_project_setting`.
    Tracked here so STORY-003+ and the next contract revision pick it up; not fixed during this
    documentation reconcile.

- **`link_types` duplicate-value returns 400, not 422 (STORY-020).** <!-- updated: 2026-07-13 (STORY-020 reconcile) -->
  The story specified a **422** for duplicate `value` fields within a `link_types` array. As built,
  plain-string / missing-field / blank / over-length entries are caught by Pydantic request-schema
  validation and return **422** as specified, but the duplicate-value and empty-list checks live in
  the settings **service** layer (a domain `ValidationError`) and therefore surface as **400** — the
  project-wide convention that domain `ValidationError` maps to 400 (dictionary/business violations
  use `UnprocessableError`→422). The exact message strings (`"link_types values must be unique"`,
  `"Dictionary values cannot be empty."`) match the story. This is a status-code-only divergence;
  the behavior (rejection with the specified message) is correct. Not fixed now — moving the
  duplicate check into the schema to return 422 would be the resolution if strict 422 is later
  required.

## Out of Scope (V1)

Multi-user/auth/RBAC, markdown migration tooling, notifications/webhooks/event streams, process
enforcement/workflow automation, and a first-class "test run" entity — all explicitly deferred per
the validated idea. The utility stores facts; it does not drive process.

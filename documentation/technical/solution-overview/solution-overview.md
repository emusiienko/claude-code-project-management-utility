# Solution Overview

## Purpose

The AI Agent Coordination Utility is a single-developer, locally-hosted tool that stores the
operational state of a multi-agent software-development pipeline — projects, stories, tasks,
task/story links, milestones, sessions, attachments, and comments — deliberately *outside* git.
It gives a heterogeneous set of participants a shared source of truth for pipeline state: AI agents
reach it through an MCP server, and the human orchestrator reaches it through a web UI, both over
one shared REST/service core.

The utility stores facts; it never enforces process. There is no dependency blocking, no workflow
automation, and no status-transition enforcement — coordination state is recorded and read back,
and the participants decide what to do with it.

## Scope

- **In scope**:
  - Persistent CRUD for the domain entities: projects, stories, tasks, task links (same story),
    story links (same project), milestones (single-project ownership + planned/active/finished
    lifecycle), sessions (project-scoped), attachments (document/image/file/external-ref),
    and comments (Markdown, with reply lineage) on stories/tasks/milestones.
  - System- and project-level dictionaries with effective-dictionary resolution (replace, never
    merge), plus a scalar `default_web_ui_role` setting.
  - Two behavior-identical access surfaces over one service layer: a REST API for the Web UI and an
    MCP server for AI agents (path-mounted on the same backend process/port).
  - Detail composition and on-demand aggregation (task/story detail with links/attachments/comments;
    story task-status aggregate; project work-state breadth read).
  - Filesystem-backed, immutable attachment file storage (create + delete only).
  - A React SPA for the human operator (Kanban board, story slide-over, deep-linked modals,
    optimistic updates).

- **Out of scope (V1)**: multi-user support, authentication, and RBAC; markdown migration tooling;
  notifications, webhooks, or event streams; process enforcement / workflow automation; and a
  first-class "test run" entity. All explicitly deferred per the validated idea.

- **Assumptions**:
  - Runs on a single developer's local machine; a brand-new project needs no configuration (absent
    project overrides fall through to system defaults).
  - Human and agents are structurally equal participants; `*_role` fields are descriptive metadata,
    not access control.

- **Constraints**:
  - Localhost-only: Docker port mapping to `127.0.0.1` is the sole access boundary — no auth by design.
  - DB-agnostic: identical schema and migrations must run on both PostgreSQL (default) and SQLite
    (opt-in, WAL); dialect-specific logic stays inside the data layer.
  - The API contract is LOCKED at v1.0 (revised incrementally through v1.9); shapes do not change
    without an architect-approved revision.
  - REST and MCP must remain behavior-identical — business logic lives only in the service layer.
  - Non-functional targets: single-resource CRUD p95 < 200 ms; list (≤1,000) p95 < 500 ms; story
    aggregate (≤500 tasks) < 300 ms; task detail (≤100 attachments + 200 comments) < 500 ms; ≥5
    concurrent requests without degradation; frontend initial load < 2 s; client navigation < 300 ms;
    WCAG 2.1 AA; desktop-only, min viewport 1,024 px; attachment upload max 10 MB; 1,000 req/min.

## System Context (C4 Level 1)

The actors are the human operator (through the Web UI) and the AI agents (through MCP). The system
is self-contained: it deliberately stores state outside git, and git is a source-control tool for
the codebase rather than a runtime integration — so there are effectively no external systems at the
context boundary. See:
- Data: `system-context.yaml`
- Diagram: `system-context.mmd`

## Key Components (C4 Level 2)

Four containers, all running on the developer's local machine under Docker Compose (localhost-only):
the React/nginx **Web UI**; the **Backend** — one FastAPI process serving both the REST API and the
path-mounted MCP server over a shared per-domain service layer; the **Application Database**
(PostgreSQL default / SQLite opt-in, DB-agnostic via SQLAlchemy); and the **Attachments Storage**
filesystem volume holding immutable attachment file content. See:
- Data: `key-components.yaml`
- Diagram: `key-components.mmd`

## Tech Stack

**Backend (single codebase, two access surfaces):**

| Technology | Version | Rationale |
|---|---|---|
| Python | 3.12 | Modern, stable; strong typing; first-class async. |
| FastAPI | ^0.138 | REST API with built-in validation, OpenAPI generation, async support. |
| Uvicorn | ^0.49 | ASGI server for FastAPI. |
| Pydantic | ^2.13 | Request/response schemas, dictionary validation, settings parsing. |
| SQLAlchemy | ^2.0 | DB-agnostic ORM — the same models run on SQLite and PostgreSQL (ADR-002). |
| Alembic | ^1.18 | Schema migrations, written portably for both dialects. |
| `mcp` (Model Context Protocol SDK) | ^1.0 | Official Python MCP server, HTTP streamable transport, path-mounted on the shared backend app/port (ADR-003, ADR-007). |
| psycopg (binary) | ^3.1 | PostgreSQL driver — used only when `DATABASE_URL` targets Postgres. |
| stdlib `sqlite3` | — | SQLite driver — the opt-in / code-fallback dialect, zero external service. |

**Frontend** (high-level stack; exact pinning owned by the frontend coding conventions):

| Technology | Rationale |
|---|---|
| React 19 + Vite | SPA justified by rich interactivity — Kanban drag-and-drop, modal deep-linking, optimistic updates (ADR-006). |
| React Router | Client-side routing (< 300 ms navigation requirement). |
| TanStack Query | Server-state cache, optimistic updates, request dedup. |
| Tailwind CSS | Utility-first styling. |
| dnd-kit | Accessible drag-and-drop for the Kanban board. |
| react-markdown | Renders Markdown content (story/task content, comments). |
| lucide-react | Sole icon library, via the shared `IconButton` primitive; per-icon named imports keep tree-shaking effective. |

**Infrastructure:**

| Technology | Rationale |
|---|---|
| Docker + Docker Compose | Whole stack runs on one developer machine, ports mapped to localhost only. Host ports and image tags are env-configurable (`BACKEND_PORT`/`WEB_PORT`/`POSTGRES_PORT`/`STACK_NAME`) so two checkouts run concurrently (prod + dev) — ADR-030. |
| nginx (frontend container) | Serves the static React build; single web entry. |
| PostgreSQL 18 (container) | The deployment default — the `postgres` Compose profile is active in `.env.example`/prod (ADR-031). SQLite is the opt-in mode and the backend code's no-`DATABASE_URL` fallback; DB-agnosticism (ADR-002) unchanged. |
| uv (backend image dependency install) | The backend image installs dependencies with `uv sync --frozen` against the committed `backend/uv.lock` for reproducible, locked builds; runtime commands run from the uv-managed venv. |

The backend is an **app-based modular monolith**: each domain is a top-level package holding its own
vertical slice — a REST controller, MCP tools, a domain service, ORM models, and Pydantic schemas —
with `core` holding only cross-cutting concerns. The controller and the MCP tools are thin layers
over the service, which is the single home of business logic and the only layer that touches the
data layer. The frontend is feature-based (one folder per feature/screen) with shared UI, hooks, a
REST client, and contract types. The repository is a monorepo (`backend/`, `frontend/`, `docs/`),
per ADR-004.

## Data Flow

**Write path (REST or MCP), e.g. "create task":**
1. A request arrives at an entry layer — the REST controller (`POST /stories/:storyId/tasks`) or an
   MCP tool (`create_task`).
2. The controller/tool parses input into the app's Pydantic schema. Field-level validation (length,
   non-empty, format) lives in the schema via `@field_validator` and fails as 422 through FastAPI's
   request-validation handler before the service is reached. Entry layers pass string IDs straight
   through — they never parse UUIDs (ADR-011).
3. It calls the app **service**, which owns business-rule validation only (uniqueness, cross-field,
   existence). String IDs are coerced to `UUID` inside `BaseRepository`, which raises `NotFoundError`
   (404) for a malformed ID (ADR-011).
4. The service resolves the owning **project** transitively (`task.story_id → story.project_id`) and
   loads that project's effective dictionaries via the settings service.
5. It validates dictionary-bound fields (`type`, `status`, `assignee_role`, `creator_role`); a
   violation raises a domain error → 422.
6. It persists via the data layer inside a transaction; timestamps are set by the layer.
7. It returns a domain object; the controller/tool serializes it to the standard envelope
   `{ "data": {...} }`.

**Read path with composition, e.g. "task detail":**
1. `GET /tasks/:id/detail` → tasks service.
2. The service loads the task plus its links (enriched with linked task id/title/status), attachments
   (metadata only), and comments (newest-first) in one service call.
3. The adapter returns `{ "data": { ...task, links, attachments, comments } }`.

Cross-domain composition (detail views, project work-state, aggregates) and application-level cascade
delete are wired through one-way, runtime-checkable reader Protocols injected via the DI container —
a service reads another app's *data layer*, never another app's service, avoiding circular imports.

**File path, e.g. "attachment file":**
1. Document/image/file content is written to the attachments volume by `core.storage`; the DB stores
   metadata plus a server-internal `file_path` (never exposed). Content arrives as REST multipart
   (Web UI) or as an MCP base64 argument (agents); both decode to bytes on one create path.
2. `GET /attachments/:id/file` streams the file with `Content-Type = mime_type` (the UI download
   path). Agents read bytes via the MCP `get_attachment_file` tool, which returns
   `{ mime_type, content_base64 }`.
3. Attachments are immutable — written once at create, never overwritten; there is no update endpoint
   and no version history. To change content, delete and re-create (no archive; delete works for
   every kind).

## Authentication Flow

**None — by deliberate design.** This is a single-developer personal tool. The access boundary is
Docker port mapping to `localhost` only; no service is exposed to the network. There is no login, no
session token, no roles, and no authorization checks. Human and agents are structurally equal
participants, and `participant_role` / `author_role` / `assignee_role` are descriptive metadata,
never access-control mechanisms.

## Error Handling Strategy

Error handling is centralized in `core`. All domain errors map to a standard shape:

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
machine-readable failures; `details` is omitted when not applicable. The domain→MCP mapping is a
single `DomainError.to_tool_error()` method returning a `ToolError` with a `[CODE] message` shape
(ADR-011). Two distinct 4xx validation paths coexist: structural field errors (schema
`@field_validator`) surface through FastAPI's request-validation handler as **422**, while the domain
`ValidationError` class maps to **400**; dictionary/business violations use `UnprocessableError` →
**422**. Per-endpoint error responses live in the API Contract, not here.

## Logging/Observability

Logging is level-driven per the error table above: 4xx domain errors log at DEBUG; 500s log a full
stack trace server-side only while returning a generic message to the client. Log verbosity is an
env-only difference between the prod and dev stacks (same image). Being a single-process,
single-machine, localhost-only tool with no network exposure, the system has no cross-service
correlation IDs or distributed tracing.

## Deployment Topology

The whole stack runs on the developer's local machine under Docker Compose, bound to `localhost`
only. For the system-level shape — services, exposure, shared infrastructure, concurrent stacks, and
volumes — see the sibling Deployment/Infrastructure View:
[`../deployment/deployment-infrastructure-view.md`](../deployment/deployment-infrastructure-view.md).

## Key Decisions

- **ADR-001** — Foundational project setup and stack baseline.
- **ADR-002** — DB-agnostic persistence via SQLAlchemy over `DATABASE_URL` (SQLite and PostgreSQL).
- **ADR-003** — Model Context Protocol server as the AI-agent access surface.
- **ADR-004** — Monorepo with app-based (vertical-slice) backend decomposition.
- **ADR-005** — Attachment version history (superseded by ADR-021).
- **ADR-006** — React 19 + Vite SPA for the human operator UI.
- **ADR-007** — MCP path-mounted on the shared backend app and single port (not a separate service).
- **ADR-008** — Project settings overrides replace, never merge, the system default.
- **ADR-009** — Seed-only migration approach (superseded by ADR-010).
- **ADR-010** — Root-table-first migration chain with inline FKs and seed bundled into its schema revision.
- **ADR-011** — String IDs passed through entry layers; UUID coercion in `BaseRepository`; unified `DomainError.to_tool_error()`.
- **ADR-012** — Dialect-aware JSON `labels` filtering inside the data layer.
- **ADR-013** — `story.milestone_id` ships FK-less; the FK is added when the `milestone` table is created.
- **ADR-014** — App-switcher navigation model, including Sessions as a distinct app.
- **ADR-015** — Single-project milestone ownership (supersedes the M:N milestone↔project design).
- **ADR-016** — Atomic milestone lifecycle; single-active-per-project enforced by the service in one transaction.
- **ADR-017** — Separate `task_links` / `story_links` packages (not one polymorphic table); task-link scope narrowed to same-story.
- **ADR-018** — Application-level cascade delete for links (SQLite FK actions are inert as built).
- **ADR-019** — Structured `link_types` dictionary (`{value, outbound, inbound}`); other dictionaries stay plain-string arrays.
- **ADR-020** — Polymorphic, FK-less `container_id` for attachments and comments across story/task/milestone.
- **ADR-021** — Attachment immutability: one file per attachment, create + delete only, no versioning (supersedes ADR-005).
- **ADR-022** — Scalar `default_web_ui_role` settings key.
- **ADR-023** — Replies as an immutable, materialized `ancestors` id-path.
- **ADR-024** — `"operator"` added to `participant_roles` (the human driving the Web UI).
- **ADR-025** — State-driven Projects/Config overlays (revises the routed-Projects/Config parts of ADR-014).
- **ADR-026** — Sessions are project-scoped with a fixed, non-dictionary 3-value status enum.
- **ADR-027** — Sessions as a distinct app mode (ratifies ADR-014's Sessions app).
- **ADR-028** — Never edit an already-applied migration in place; ship a new corrective revision instead (narrows ADR-010).
- **ADR-029** — Project work-state aggregate breadth read exposed additively on both REST and MCP.
- **ADR-030** — Concurrent local stacks via env-configurable host ports and per-stack image tags.
- **ADR-031** — PostgreSQL as the deployment default with a prod/dev env-template split (refines, not supersedes, ADR-002).

Open items carried in the reconcile log (not yet ADR-backed): enabling SQLite `PRAGMA foreign_keys = ON`
so declared `CASCADE`/`SET NULL` actions become enforced, and adding an end-to-end clear-project-override
operation (service method exists; no REST route/MCP tool exposes it, and the contract has no clear operation).

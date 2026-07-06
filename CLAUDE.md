# AI Agent Coordination Utility

A single-developer, locally-hosted utility that stores the operational state of a multi-agent dev
pipeline (projects, stories, tasks, sessions, attachments) outside of git — accessible to AI agents
via an MCP server and to the human orchestrator via a web UI.

## Repository Structure
| Folder | Purpose |
|--------|---------|
| `backend/` | Python app — REST API + MCP server over a shared per-app service layer |
| `backend/app/<domain>/` | One package per domain (projects, stories, tasks, task_links, attachments, comments, sessions, milestones, settings) |
| `backend/app/core/` | Cross-cutting: config, DB engine/session, errors, storage, dictionary resolution |
| `backend/migrations/` | Alembic migrations |
| `frontend/` | React 19 + Vite SPA (screen-based: `src/screens`, `src/shared`, `src/core`, `src/api`) |
| `docs/` | SDLC documentation |

## Commands
> Canonical commands are owned by **devops** (`docker-compose.yml`, `deploy.sh`) and the dev
> conventions docs. Placeholders below — update during implementation.

| Command | Description |
|---------|-------------|
| `docker compose up` | Start full stack (REST :8000, MCP :8001, Web :3000) on localhost |
| `./deploy.sh` | Single entry point (owned by devops) |
| `alembic upgrade head` | Apply DB migrations |

## Key Docs
- Architecture: docs/architecture.md
- API Contract: docs/api-contract.md  ← **v1.0 LOCKED**
- Tech Decisions: docs/tech_decisions/ (ADR-001 … ADR-011; ADR-009 superseded by ADR-010)
- Backend Conventions: docs/backend-coding-conventions.md  ← owned by backend-developer (TBD)
- Frontend Conventions: docs/frontend-coding-conventions.md ← owned by frontend-developer (TBD)
- DevOps Strategy: docs/devops-strategy.md ← owned by devops (TBD)
- Requirements: docs/requirements.md (backend + web)
- User Stories: docs/stories/index.md
- Team / active roles: docs/team.md

## Code Map

- `backend/app/main.py` — application entry point; wires DI container, registers middleware + exception handlers, mounts REST router + MCP server on the same port (:8000)
- `backend/app/config.py` — typed `Settings` via pydantic-settings; single reader of all environment variables
- `backend/app/exc_handlers.py` — FastAPI exception handlers: `domain_error_handler`, `request_validation_error_handler`; `_build_error_body` helper
- `backend/app/core/errors.py` — `ErrorCode` enum; `DomainError` class hierarchy (one subclass per HTTP status)
- `backend/app/core/database/` — `Base`, `UUIDType`, `build_engine()` (SQLite WAL), session factory, `BaseRepository[T]`
- `backend/app/core/storage/` — `FilesystemStorage` with write/read/snapshot for attachment files
- `backend/app/container/` — `AppContainer` DI composition root; `db_session` Factory + Settings + Projects providers; `container` singleton exported for wiring; `mcp_dependencies.py` — `provide_settings_service` + `provide_project_service` MCP async context managers (`@asynccontextmanager` + `@inject`), used via `fastmcp.dependencies.Depends()`
- `backend/app/api/` — FastAPI app factory shell; CORS + error handler registered; domain routers added in TASK-004+
- `backend/app/mcp/` — `FastMCP` server (HTTP Streamable transport, path-mounted at `/mcp`); Settings tools registered; future domains add tools via `register_*_tools(mcp_server)`
- `backend/app/settings/` — `constants.py` (six `DICT_KEY_*` constants, `ALL_DICT_KEYS`, `validate_dict_key()`); `SystemSettings` + `ProjectSettings` ORM models; `SystemSettingsRepository` + `ProjectSettingsRepository`; `SettingsService` (all business rules; implements `EffectiveDictionary` Protocol); `EffectiveDictionary` + `ProjectChecker` Protocols in `service.py`; `schema.py` (Pydantic request/response schemas); `dependencies.py` (`_get_db` + `get_settings_service` FastAPI Depends); `controller.py` (5 route handlers under `/v1`); `mcp_tools.py` (5 MCP tools mirroring the REST surface)
- `backend/app/projects/` — `Project` ORM model (`model.py`); `ProjectRepository` with `list_paginated`, `get_by_name_lower`, `get_name_conflict` (`repository.py`); `ProjectService` (create/get/list_paginated/update/delete, all validation + uniqueness rules, `service.py`); `schema.py` (`CreateProjectBody`, `UpdateProjectBody`, `ProjectResponse`, `PaginationMeta`); `controller.py` (5 REST route handlers: POST/GET list/GET by id/PUT/DELETE under `/v1/projects`); `mcp_tools.py` (5 MCP tools mirroring the REST surface: `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`)
- `backend/migrations/` — Alembic env.py (reads DATABASE_URL from settings); `0001_project` (project table + Test Project seed); `0002_settings` (system_settings + project_settings with inline FK to project + six default dictionaries seed)
- `frontend/src/app/` — application composition root: App.tsx (providers), Layout.tsx (nav shell + Outlet), router.tsx (route table), queryClient.ts (TQ singleton), index.css (global styles)
- `frontend/src/core/client.ts` — typed fetch wrapper; `ApiRequestError` class; `apiClient` with get/post/put/patch/delete/upload methods
- `frontend/src/api/types.ts` — all API contract TypeScript interfaces (derived from docs/api-contract.md v1.0)
- `frontend/src/api/paths.ts` — centralized `API_PATHS` constant; all URL strings live here
- `frontend/src/api/api_config.ts` — `PAGINATION` page-size limits and `DATA_FRESHNESS` stale times per domain
- `frontend/src/config/cacheConfig.ts` — `CACHE_KEYS` registry: all TanStack Query cache keys for every domain
- `frontend/src/api/endpoints/settings.ts` — plain async functions for all six Settings API endpoints
- `frontend/src/api/endpoints/projects.ts` — plain async function for GET /v1/projects; full CRUD added in STORY-003
- `frontend/src/shared/components/PageLoader.tsx` — full-page accessible loading spinner (aria-busy)
- `frontend/src/shared/components/PlaceholderScreen.tsx` — generic "coming soon" screen used by all not-yet-implemented features
- `frontend/src/shared/components/IconButton.tsx` — shared icon-button primitive for item/row-level actions; owns the full visual contract (size, intent variants, hover/focus/disabled states)
- `frontend/src/shared/hooks/useProjectList.ts` — cross-feature TanStack Query hook for the project list
- `frontend/src/features/projects/` — Project Management screen: ProjectsPage (list + create/edit/delete), components/ (ProjectList, ProjectModal, ProjectForm, DeleteProjectDialog), hooks/ (useProjects — list query + CRUD mutations), utils/ (errorMessages)
- `frontend/src/features/stories/` — Stories placeholder page (STORY-004)
- `frontend/src/features/tasks/` — Tasks placeholder page (STORY-005)
- `frontend/src/features/task-links/` — Task Links placeholder page (STORY-006)
- `frontend/src/features/attachments/` — Attachments placeholder page (STORY-007)
- `frontend/src/features/comments/` — Comments placeholder page (STORY-008)
- `frontend/src/features/sessions/` — Sessions placeholder page (STORY-009)
- `frontend/src/features/milestones/` — Milestones placeholder page (STORY-012)
- `frontend/src/features/cross-project/` — Cross-project view placeholder page (STORY-011)
- `frontend/src/features/settings/` — Settings feature: SettingsPage.tsx (tab switcher), components/ (SystemSettings, ProjectSettings, DictionaryEditor), hooks/ (useSystemSettings, useProjectSettings)

## Infrastructure

Single environment: the developer's local machine (Docker Compose, localhost-only). All published ports bind to `127.0.0.1` — this is the only access boundary (no auth, by design).

| Service | URL (localhost) | Notes |
|---------|-----------------|-------|
| Backend (REST + MCP) | http://localhost:8000 | One Uvicorn process; MCP path-mounted at `/mcp`; OpenAPI docs at `/v1/docs` |
| Web UI | http://localhost:3000 | nginx serving the static React (Vite) build |
| PostgreSQL (opt-in) | localhost:5432 | Only under the `postgres` profile; absent on the SQLite default |

**Run** (single entry point — the user runs this, never an agent):

| Command | Description |
|---------|-------------|
| `./deploy.sh up` | Build images, run migrations, start the stack |
| `./deploy.sh down` | Stop the stack (named volumes preserved) |
| `./deploy.sh rebuild` | Rebuild images (no cache), then up |
| `./deploy.sh migrate` | Run `alembic upgrade head` only |
| `./deploy.sh logs` | Follow stack logs |

**Database**: SQLite is the **default** (`sqlite:///data/app.db`, WAL, on the `sqlite_data` volume — no container). PostgreSQL is **opt-in**: set `DATABASE_URL=postgresql+psycopg://...` in `.env` and `deploy.sh` auto-activates the `postgres` profile. The same Alembic migrations run unchanged on both dialects; the backend entrypoint applies them before serving.

**Config**: all via env vars (`.env`, git-ignored; copy from `.env.example`). No application secrets (no auth, local-only); the only credential is the local Postgres password, used between containers only.

**Volumes** (survive `down`; wiped only by `docker compose down -v`): `sqlite_data` (SQLite file), `pg_data` (Postgres data), `attachments` (attachment files + version snapshots).

**IaC files**: `docker-compose.yml`, `deploy.sh`, `backend/Dockerfile` (+ `docker-entrypoint.sh`), `frontend/Dockerfile` (+ `nginx.conf`), `.env.example`.

**Backend image dependencies**: installed with **uv** (`uv sync --frozen` against the committed `backend/uv.lock`), matching the local dev toolchain for reproducible locked builds. `alembic` and `uvicorn` resolve from the uv-managed venv via `PATH` — the entrypoint and CMD are unchanged. Do not reintroduce `pip install` in the backend image.

## Gotchas
- **No auth, by design.** Docker localhost port mapping is the only access boundary. Never add login/roles/RBAC. `*_role` fields are descriptive metadata, not access control.
- **DB is configurable (SQLite default | PostgreSQL) via `DATABASE_URL`.** Keep all code DB-agnostic; dialect-specific logic (JSON `labels` filters, UUID type, case-insensitive uniqueness) stays inside the data layer. SQLite must run in WAL mode.
- **REST and MCP share one service layer.** Put business logic in the app `service`, never in a controller or MCP tool. Both surfaces must stay behavior-identical.
- **Attachment content lives on the filesystem** (attachments Docker volume), not in the DB. `file_path` is server-internal and must never appear in API responses. Documents/images are archived, never deleted; only external-ref is deletable.
- **The utility stores facts; it never enforces process** — no blocking on dependencies, no workflow automation, no status transition rules.
- **API contract is LOCKED at v1.0** — do not change shapes without an architect-approved revision.
- **Top-level nav is exactly 3 items** (Projects `/`, Sessions `/sessions`, Settings `/settings`). All other domains are sub-views under their parent context — do not add them as top-level nav entries. Routes exist as placeholder screens; STORY-003+ fill them in.
- **Clear-override is broken end-to-end (known gap, STORY-002).** Service has `clear_project_setting` but no REST/MCP route exposes it; the frontend calls a non-existent `DELETE /projects/:id/settings/:key`. Needs a contract revision + backend route. See `docs/architecture.md` § Known Divergences.

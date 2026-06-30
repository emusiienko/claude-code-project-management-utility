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
- Tech Decisions: docs/tech_decisions/ (ADR-001 … ADR-006)
- Backend Conventions: docs/backend-coding-conventions.md  ← owned by backend-developer (TBD)
- Frontend Conventions: docs/frontend-coding-conventions.md ← owned by frontend-developer (TBD)
- DevOps Strategy: docs/devops-strategy.md ← owned by devops (TBD)
- Requirements: docs/requirements.md (backend + web)
- User Stories: docs/stories/index.md
- Team / active roles: docs/team.md

## Code Map

- `backend/main.py` — application entry point; mounts FastAPI REST app + MCP server on the same port (:8000)
- `backend/app/core/config.py` — typed `Settings` via pydantic-settings; single reader of all environment variables
- `backend/app/core/constants.py` — six dictionary key name constants (`DICT_KEY_*`) and `ALL_DICT_KEYS` frozenset
- `backend/app/core/errors.py` — domain error classes, error code constants, centralized `domain_error_handler`
- `backend/app/core/dict_resolver.py` — `EffectiveDictionary` Protocol + `validate_dict_key()` helper
- `backend/app/core/database/` — `Base`, `UUIDType`, `build_engine()` (SQLite WAL), session factory, `BaseRepository[T]`
- `backend/app/core/storage/` — `FilesystemStorage` with write/read/snapshot for attachment files
- `backend/app/container/` — `AppContainer` DI composition root; `db_session` Factory + all Settings providers; `SqlProjectChecker` for cross-domain project existence check; `container` singleton exported for wiring
- `backend/app/api/` — FastAPI app factory shell; CORS + error handler registered; domain routers added in TASK-004+
- `backend/app/mcp/` — `FastMCP` server (HTTP Streamable transport, path-mounted at `/mcp`); Settings tools registered; future domains add tools via `register_*_tools(mcp_server)`
- `backend/app/settings/` — `SystemSettings` + `ProjectSettings` ORM models; `SystemSettingsRepository` + `ProjectSettingsRepository`; `SettingsService` (all business rules + `EffectiveDictionary` impl); `schema.py` (Pydantic request/response schemas); `dependencies.py` (`_get_db` + `get_settings_service` FastAPI Depends); `controller.py` (5 route handlers under `/v1`); `mcp_tools.py` (5 MCP tools mirroring the REST surface)
- `backend/app/projects/` — `Project` ORM model (`model.py`); `ProjectRepository` extending `BaseRepository[Project]` with `list_paginated`, `get_by_name_lower`, `get_name_conflict` (`repository.py`); stub `controller.py` (GET /v1/projects returns empty list, STORY-013); full service/schema/controller/mcp_tools added in STORY-003
- `backend/migrations/` — Alembic env.py (reads DATABASE_URL from settings); `0001_project` (project table + Test Project seed); `0002_settings` (system_settings + project_settings with inline FK to project + six default dictionaries seed)
- `frontend/src/core/` — app root (App.tsx, Layout.tsx, router.tsx), global CSS, QueryClient singleton
- `frontend/src/api/client.ts` — typed fetch wrapper; `ApiRequestError` class; multipart upload support
- `frontend/src/api/types.ts` — all API contract TypeScript interfaces (derived from docs/api-contract.md v1.0)
- `frontend/src/api/queryKeys.ts` — centralized TanStack Query key factory for all domains
- `frontend/src/api/settings.ts` — TanStack Query hooks for all six Settings endpoints (system + project overrides)
- `frontend/src/api/projects.ts` — project list hook (`useProjectList`); full CRUD mutations added in STORY-003
- `frontend/src/shared/ui/PageLoader.tsx` — full-page accessible loading spinner (aria-busy)
- `frontend/src/shared/ui/PlaceholderScreen.tsx` — generic "coming soon" screen used by all not-yet-implemented routes
- `frontend/src/screens/projects/` — Projects placeholder screen (STORY-003 fills this in)
- `frontend/src/screens/stories/` — Stories placeholder screen (STORY-004)
- `frontend/src/screens/tasks/` — Tasks placeholder screen (STORY-005)
- `frontend/src/screens/task-links/` — Task Links placeholder screen (STORY-006)
- `frontend/src/screens/attachments/` — Attachments placeholder screen (STORY-007)
- `frontend/src/screens/comments/` — Comments placeholder screen (STORY-008)
- `frontend/src/screens/sessions/` — Sessions placeholder screen (STORY-009)
- `frontend/src/screens/milestones/` — Milestones placeholder screen (STORY-012)
- `frontend/src/screens/cross-project/` — Cross-project view placeholder screen (STORY-011)
- `frontend/src/screens/settings/` — System & Project settings screens: tab switcher (index.tsx), SystemSettings.tsx, ProjectSettings.tsx, DictionaryEditor.tsx

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

## Gotchas
- **No auth, by design.** Docker localhost port mapping is the only access boundary. Never add login/roles/RBAC. `*_role` fields are descriptive metadata, not access control.
- **DB is configurable (SQLite default | PostgreSQL) via `DATABASE_URL`.** Keep all code DB-agnostic; dialect-specific logic (JSON `labels` filters, UUID type, case-insensitive uniqueness) stays inside the data layer. SQLite must run in WAL mode.
- **REST and MCP share one service layer.** Put business logic in the app `service`, never in a controller or MCP tool. Both surfaces must stay behavior-identical.
- **Attachment content lives on the filesystem** (attachments Docker volume), not in the DB. `file_path` is server-internal and must never appear in API responses. Documents/images are archived, never deleted; only external-ref is deletable.
- **The utility stores facts; it never enforces process** — no blocking on dependencies, no workflow automation, no status transition rules.
- **API contract is LOCKED at v1.0** — do not change shapes without an architect-approved revision.
- **Top-level nav is exactly 3 items** (Projects `/`, Sessions `/sessions`, Settings `/settings`). All other domains are sub-views under their parent context — do not add them as top-level nav entries. Routes exist as placeholder screens; STORY-003+ fill them in.
- **Clear-override is broken end-to-end (known gap, STORY-002).** Service has `clear_project_setting` but no REST/MCP route exposes it; the frontend calls a non-existent `DELETE /projects/:id/settings/:key`. Needs a contract revision + backend route. See `docs/architecture.md` § Known Divergences.

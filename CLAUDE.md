# AI Agent Coordination Utility

A single-developer, locally-hosted utility storing the operational state of a multi-agent dev pipeline for AI agents over MCP and a human orchestrator over a web UI.

## Repository Structure

| Folder | Purpose |
|--------|---------|
| `backend/` | Python service — REST API + MCP server over one shared service layer |
| `backend/app/` | One package per domain (model, repository, service, schema, controller, mcp_tools) + `core/` for cross-cutting database, errors, storage |
| `backend/migrations/` | Alembic migrations |
| `backend/adr-log/` | Backend-scoped ADRs — own series, separate from the project ADR Log |
| `frontend/` | React 19 + Vite single-page web UI (TypeScript, Tailwind) |
| `frontend/src/` | `app/` shell+router, `api/`, `config/`, `core/`, `features/<domain>/`, `shared/` |
| `frontend/adr-log/` | Frontend-scoped ADRs — own series, separate from the project ADR Log |
| `documentation/` | As-built docs — `business/` (business-analyst), `technical/` (architect) |
| `automation/` | Black-box API test suite (qa-automation) |
| `qa/` | Manual test case registry (manual-qa) |
| `.fast-sdlc/` | Fast SDLC operating folder — task management, requirements, role configs, shared conventions |

## Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh {up\|down\|rebuild\|migrate\|logs}` | Whole-stack entry point — **user-run, never agent-run** |
| `uv sync --dev` | Backend: create/refresh `backend/.venv` (run from `backend/`) |
| `DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/ -v` | Backend: full test suite (from `backend/`) |
| `uv run black . && uv run isort .` | Backend: format + sort imports |
| `uv run alembic upgrade head` | Backend: apply migrations against the configured DB |
| `npm run dev` | Frontend: Vite dev server on :3000 (run from `frontend/`) |
| `npx vitest run` | Frontend: unit/component tests — there is no `test` script in `package.json` |
| `npm run build` | Frontend: typecheck (`tsc --noEmit`) then production build |

## Key Docs

Resolve artifact locations from `fast-sdlc-project-setup.md` > Artifacts rather than from memory — the
pointers below are entry points, not the full inventory.

- **Technical Documentation**: `documentation/technical/` — **start at `sad.md`** (the master/entry doc).
  Covers Solution Overview (+ C4 L1/L2 graph+diagram pairs), NFR, Physical Data Model, API Contracts,
  Deployment/Infrastructure View, ADR Log. `index.md` maps the whole folder.
- **API Contract**: `documentation/technical/api-contracts/coordination-service.md` — **LOCKED**, as-built
  head **v1.10**. One backend service (REST + path-mounted MCP over a shared service layer); every REST
  route lives under the `/v1` base path. Shapes change only via an architect-approved revision. It
  documents what the running backend actually serves — read it as the definitive API surface, never as a
  superset.
- **ADR Log**: `documentation/technical/adr-log/` — `ADR-001`…`ADR-031`, **next id ADR-032**, referenced by
  ID from the SAD. ADR-009 superseded by ADR-010; ADR-005 by ADR-021. An ADR body is never edited — only
  its `Status`.
- **Data models — three layers, two owners**: Conceptual + Logical at
  `documentation/business/conceptual-data-model/` and `logical-data-model/` (business-analyst; YAML, one
  file per subject area plus a shared `catalog.yaml`); Physical at
  `documentation/technical/data-models/physical-data-model.md` (architect). The Logical model is the
  business-meaning anchor the Physical one traces to — read it before any data-model work rather than
  re-deriving business meaning.
- **Business Documentation**: `documentation/business/` — as-built behavior from the business view;
  `index.md` lists one file per capability.
- **Requirements**: `.fast-sdlc/requirements/specs/` — pending scope only, currently none. Everything
  already built is described in Business Documentation instead.
- **Architectural Design**: `.fast-sdlc/planning/<scope-slug>/architecture-design/` — one folder per
  milestone or story group being planned; currently none. A story's cross-repo Story Implementation Plan,
  when one is needed, sits in that story's own folder under Task Management.
- **Coding Conventions**: `.fast-sdlc/conventions/coding-conventions-backend.md` and
  `coding-conventions-frontend.md` — one per stack, each owned by that stack's lead-developer.
- **Code Map**: `.fast-sdlc/code-maps/frontend.md` (frontend stack) and
  `.fast-sdlc/code-maps/backend.md` (backend stack) — coder's own module/function-level account of
  where things live in the code, more granular than this file's own Repository Structure table;
  kept current at Reconcile.
- **DevOps Strategy**: `.fast-sdlc/conventions/devops-strategy.md`.
- **QA**: strategy at `.fast-sdlc/conventions/qa-strategy.md`, manual test case registry at
  `qa/test-cases.md` + `qa/test-cases/`; automation strategy at
  `.fast-sdlc/conventions/qa-automation-strategy.md`, black-box suite at `automation/`.
- **Stories, Tasks, Milestones**: `.fast-sdlc/task-management/index.md`.
- **Team / active roles**: `fast-sdlc-project-setup.md` > Team.

### Fast SDLC
Config: `fast-sdlc-project-setup.md` (repo root) — team/roles, artifact locations, Task Management
(`.fast-sdlc/task-management/`), Sessions, Pull Requests, Escalation/Feedback.

## Infrastructure

One environment: the developer's local machine, as a Docker Compose stack. Every published port binds
to `127.0.0.1` only — that binding **is** the access boundary (no auth, by design). Nothing is
deployed off the machine: there is no cloud provider, no IAM, no secrets manager, no CI service.
Full detail in `.fast-sdlc/conventions/devops-strategy.md`.

**Two concurrent stacks.** Two checkouts in *differently-named folders* can run at once — Compose
namespaces containers, networks, and volumes by folder basename. Only host ports and image tags are
env-configurable (`BACKEND_PORT`, `WEB_PORT`, `POSTGRES_PORT`, `STACK_NAME`); container-internal
ports stay fixed at 8000/3000/5432.

| Service | prod stack | dev stack | Notes |
|---|---|---|---|
| Backend (REST + MCP) | http://localhost:8000 | http://localhost:8100 | One Uvicorn process; MCP path-mounted at `/mcp`; OpenAPI at `/v1/docs` |
| Web UI (nginx + Vite build) | http://localhost:3000 | http://localhost:3100 | `VITE_API_BASE_URL` is baked in at **build** time — it must match that stack's backend port |
| PostgreSQL | localhost:5432 | localhost:5433 | Own `db` container per stack, under the `postgres` profile; absent on the SQLite opt-in |

**Agents always operate in the dev checkout** (`STACK_NAME=dev`, ports 8100/3100/5433). A prod stack
is a separate, user-managed checkout no agent ever enters — so any agent-run local command (logs,
container inspection, `curl` against a running service) targets the dev ports. Agents do not select a
stack: the user picks it out of band by copying an env template to `.env`, and `deploy.sh` takes no
environment argument.

**Inside the devcontainer the addresses differ.** The `localhost:*` addresses above work from the
host only. The devcontainer's `dev` service joins the dev stack's `agent-access` Docker network
(`aiacu-agent-access-dev`, added by `docker-compose.dev.yml`, which `deploy.sh` layers in only when
`STACK_NAME=dev`) and reaches the same services by container DNS name on their **container-internal**
ports: `http://backend:8000` and `http://web:3000` — never `localhost:8100`/`:3100`. `db` is
deliberately off that network. The prod stack never loads the override, so it has no such network.
The dev stack creates it, so `./deploy.sh up` must run before the devcontainer starts or rebuilds —
otherwise the devcontainer's own `docker compose up` fails with "network not found".

**Run** — single entry point, **always user-run, never agent-run**:

| Command | Description |
|---|---|
| `./deploy.sh up` | Build images, apply migrations, start the stack |
| `./deploy.sh down` | Stop the stack (volumes preserved) |
| `./deploy.sh rebuild` | Rebuild images with no cache, migrate, then up |
| `./deploy.sh migrate` | `alembic upgrade head` only |
| `./deploy.sh logs` | Follow stack logs |

`deploy.sh` activates the `postgres` Compose profile whenever `DATABASE_URL` targets Postgres, and
waits for the `db` healthcheck before migrating. Migrations also run in the backend container's
entrypoint, so a bare `docker compose up` is correct too.

**Database**: PostgreSQL is the deployment default (`.env.example`, and the Compose/`deploy.sh`
fallback); SQLite (`sqlite:///data/app.db`, WAL) is the opt-in and the `.env.dev.example` default.
The same Alembic scripts run on both dialects.

**Config**: all via env vars. `.env` is git-ignored; two committed templates — `.env.example` (prod
stack) and `.env.dev.example` (dev stack) — copy the matching one per checkout. No application
secrets; the only credential is the local Postgres password, used between containers only.

**Volumes** (survive `down`; wiped only by an explicit `docker compose down -v`, never scripted):
`pg_data`, `sqlite_data`, `attachments`.

**Infrastructure files**: `docker-compose.yml`, `docker-compose.dev.yml`, `deploy.sh`, `backend/Dockerfile` +
`backend/docker-entrypoint.sh`, `frontend/Dockerfile` + `frontend/nginx.conf`, `.env.example`,
`.env.dev.example`, `.gitignore`. Backend image dependencies install with **uv**
(`uv sync --frozen` against the committed `backend/uv.lock`) — never reintroduce `pip install` there.

**Quality gates run manually.** The DevOps Strategy describes pre-commit hooks, but no
`.pre-commit-config.yaml` is committed — the lint/format/type-check/test commands under `## Commands`
are run by hand per stack.

## Gotchas

- **No auth, by design.** Localhost port binding is the only access boundary — never add login or RBAC.
  `*_role` fields are descriptive metadata, not access control.
- **Business logic lives in `service.py` only.** REST and MCP share one service layer and must stay
  behavior-identical; never put logic in a controller or an MCP tool.
- **Keep backend code DB-agnostic.** PostgreSQL is the deployment default, SQLite the opt-in and code
  fallback; dialect-specific logic stays inside `app/core/database/`, and SQLite runs in WAL mode.
- **Never edit an applied Alembic migration in place** — ship a corrective revision that detects the stale
  shape structurally. Alembic keys off the revision id, not file content; this has caused drift twice.
- **Attachment bytes live on the filesystem, not the DB.** `file_path` is server-internal and must never
  appear in an API response. Attachments are immutable — create and delete only, no update, no archive.
- **The utility stores facts; it never enforces process** — no dependency blocking, no transition rules.
- **`src/api/types.ts` is not the API surface.** It derives from the contract but still declares types no
  endpoint returns — check the API Contract for what exists, never the types file.
- **Frontend env vars are `import.meta.env.VITE_*` only** — `process.env` does not exist in this build.
- **Top-level nav is exactly 3 entries** (Task Manager, Sessions, Projects/Config); every other domain is a
  sub-view. Projects and Config are state-driven overlays — never re-add `/projects` or `/settings`.

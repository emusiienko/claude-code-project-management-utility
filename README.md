# AI Agent Coordination Utility

A single-developer, locally-hosted utility that stores the operational state of a multi-agent dev pipeline (projects, stories, tasks, sessions, attachments), accessible to AI agents via an MCP server and to the human orchestrator via a web UI.

## Deployment

Single environment: the developer's local machine (Docker Compose, localhost-only). All ports bind to `127.0.0.1`.

Requires Docker with the Compose v2 plugin. On first run, `./deploy.sh` creates `.env` from `.env.example` (the prod stack, PostgreSQL default).

### Run locally

```bash
./deploy.sh up        # build images, run migrations, start the stack
./deploy.sh down      # stop the stack (data volumes preserved)
./deploy.sh rebuild   # rebuild images from scratch, then up
./deploy.sh migrate   # run alembic upgrade head only
./deploy.sh logs      # follow stack logs
```

Database: PostgreSQL is the default. To use SQLite instead, set `DATABASE_URL=sqlite:///data/app.db` in `.env` — `deploy.sh` then runs with no `db` container.

### Running two stacks concurrently

Two checkouts of this repo, in differently-named folders, can run at the same time: a stable **prod**
stack plus the active **dev** checkout. Each has its own committed env template — copy the matching
one to `.env`:

- **Prod checkout:** `cp .env.example .env` (`STACK_NAME=prod`, ports `8000` / `3000` / `5432`,
  PostgreSQL). `./deploy.sh` bootstraps this automatically on first run.
- **Dev checkout:** `cp .env.dev.example .env` (`STACK_NAME=dev`, ports `8100` / `3100` / `5433`,
  SQLite; `VITE_API_BASE_URL` / `CORS_ALLOWED_ORIGINS` already matched to the offset ports).

Then run `./deploy.sh up` in each. See `.fast-sdlc/conventions/devops-strategy.md` § Running Two Stacks Concurrently.

### Resources

| Resource | URL (localhost) |
|----------|-----------------|
| Backend REST API | http://localhost:8000 (OpenAPI docs at `/v1/docs`) |
| MCP server | http://localhost:8000/mcp/v1 |
| Web UI | http://localhost:3000 |
| PostgreSQL (default DB) | localhost:5432 |

Ports above are the defaults; a second concurrent stack uses its own `BACKEND_PORT` / `WEB_PORT` / `POSTGRES_PORT` (see "Running two stacks concurrently").

### Access from other projects' devcontainers (prod stack)

The prod stack creates the Docker network `aiacu-external-access` and attaches two services to it: the backend, as `aiacu-backend`, and a second Web UI instance (`web-external`), as `aiacu-web`. In another project's Compose file, join the network, then call `http://aiacu-backend:8000` (REST under `/v1`, MCP at `/mcp/v1`) and open the Web UI in a browser such as Playwright at `http://aiacu-web:3000`:

```yaml
services:
  <your-service>:
    networks: [default, aiacu]
networks:
  aiacu:
    external: true
    name: aiacu-external-access
```

Start this prod stack (`./deploy.sh up`) before that devcontainer. The dev stack never creates this network or the `web-external` instance. Requires Docker Compose 2.24.4 or later.

The backend accepts browser calls from both `http://localhost:3000` and `http://aiacu-web:3000`. An existing prod `.env` created before this change must list both in `CORS_ALLOWED_ORIGINS`, space-separated, as `.env.example` does.

Start a dev checkout only with `./deploy.sh`, never with a bare `docker compose up`. Without `deploy.sh`, the dev stack joins this network under the same `aiacu-backend` and `aiacu-web` names, and other projects' calls get split between the prod and dev stacks.

---

## Local backend development

Dependencies are managed with [uv](https://docs.astral.sh/uv/). The virtual environment lives at `backend/.venv`.

### Setup

```bash
cd backend
uv sync --dev        # creates .venv and installs all deps (runtime + dev)
```

### Dependency management

```bash
uv sync --dev        # re-sync after git pull
uv add <pkg>         # add a runtime dependency (updates pyproject.toml + uv.lock)
uv add --dev <pkg>   # add a dev-only dependency
uv lock              # regenerate uv.lock after manually editing pyproject.toml
```

### Run tests

```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/ -v
```

### Run migrations (local SQLite)

```bash
cd backend
DATABASE_URL="sqlite:///./data/app.db" uv run alembic upgrade head
```
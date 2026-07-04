# AI Agent Coordination Utility

A single-developer, locally-hosted utility that stores the operational state of a multi-agent dev pipeline (projects, stories, tasks, sessions, attachments), accessible to AI agents via an MCP server and to the human orchestrator via a web UI.

## Deployment

Single environment: the developer's local machine (Docker Compose, localhost-only). All ports bind to `127.0.0.1`.

Requires Docker with the Compose v2 plugin. On first run, `./deploy.sh` creates `.env` from `.env.example` (SQLite default).

### Run locally

```bash
./deploy.sh up        # build images, run migrations, start the stack
./deploy.sh down      # stop the stack (data volumes preserved)
./deploy.sh rebuild   # rebuild images from scratch, then up
./deploy.sh migrate   # run alembic upgrade head only
./deploy.sh logs      # follow stack logs
```

Database: SQLite is the default. To use PostgreSQL, set `DATABASE_URL=postgresql+psycopg://app:app@db:5432/app` in `.env` — `deploy.sh` then starts the `db` container automatically.

### Resources

| Resource | URL (localhost) |
|----------|-----------------|
| Backend REST API | http://localhost:8000 (OpenAPI docs at `/v1/docs`) |
| MCP server | http://localhost:8000/mcp |
| Web UI | http://localhost:3000 |
| PostgreSQL (opt-in only) | localhost:5432 |

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
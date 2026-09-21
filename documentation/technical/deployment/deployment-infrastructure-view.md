# Deployment / Infrastructure View

System-level deployment topology for the AI Agent Coordination Utility. This is the current-state
topology view — the concrete infrastructure-as-code (Compose, deploy script, Dockerfiles, env
templates) is owned by devops (see § Ownership), not restated here.

## Overview

There is a single environment: the developer's local machine. The whole stack runs under Docker
Compose, with every published port bound to `127.0.0.1` (localhost). Nothing is exposed to the
network — localhost port mapping is the only access boundary, by deliberate design (single-developer
personal tool, no authentication). See § Access Boundary.

## Services & Topology

| Service | Container | Default host port | Exposure |
|---------|-----------|-------------------|----------|
| Backend (REST + MCP) | FastAPI on a single Uvicorn process; the MCP server is path-mounted on the same app (e.g. `/mcp`), not a separate port | 8000 | localhost only |
| Web UI | nginx serving the static React (Vite) build | 3000 | localhost only |
| PostgreSQL | PostgreSQL container, run under the `postgres` Compose profile | 5432 | localhost only |

The backend serves both access surfaces from one port over a shared service layer: the REST API for
the Web UI and the MCP server for AI agents. The Web UI container never talks to MCP — it consumes
the REST contract only. The PostgreSQL container is present only when the database is PostgreSQL
(the deployment default); in the SQLite opt-in there is no `db` container.

## Database

The system is DB-agnostic (SQLAlchemy over `DATABASE_URL`); the same Alembic migrations run unchanged
on both dialects (ADR-002).

- **PostgreSQL** is the deployment default (ADR-031) — the `postgres` Compose profile is active and
  the deploy flow applies migrations before serving. Data lives in the `pg_data` volume.
- **SQLite** is the opt-in mode (WAL, a file on the `sqlite_data` volume, no container) and remains
  the backend code's fallback when no `DATABASE_URL` is set anywhere.

Switching dialects is a single `DATABASE_URL` change; no application code differs between them.

## Concurrent Stacks

Two checkouts in differently-named folders can run at once — a stable "prod" stack and the active
"dev" stack (ADR-030). Container, volume, and network isolation comes from Compose's folder-based
project naming; the two things Compose does not namespace are covered by configuration:

- **Host ports** are env-configurable — `BACKEND_PORT`, `WEB_PORT`, `POSTGRES_PORT` — with the
  canonical values as defaults; container-internal ports stay fixed.
- **`STACK_NAME`** namespaces the built image tags per stack (default `prod`).

Two committed env templates align to this model: `.env.example` (prod — `STACK_NAME=prod`, canonical
ports 8000/3000/5432, PostgreSQL) and `.env.dev.example` (dev — `STACK_NAME=dev`, offset ports
8100/3100/5433, SQLite, with the browser-coupling variables pre-matched to the offset ports). Each
stack that uses PostgreSQL runs its own database container (no shared server).

## Volumes

Named volumes survive `down` and are wiped only by `down -v`:

- `sqlite_data` — the SQLite database file (SQLite mode only).
- `pg_data` — PostgreSQL data (PostgreSQL mode only).
- `attachments` — attachment file content (`file_path` is server-internal and never serialized; content lives on this volume, not in the DB).

## Configuration

All configuration is read from environment variables (12-factor). There are no application secrets by
design (no auth, local-only); the only credential is the local PostgreSQL password, used between
containers only. Two committed templates are copied to `.env` per checkout — `.env.example` (prod
stack, PostgreSQL) and `.env.dev.example` (dev stack, SQLite). "prod" and "dev" are the two named
concurrent stacks, both on the developer's localhost — not release environments. Grouped by concern,
configuration covers the database (`DATABASE_URL`), attachment storage directory, host service ports
and `STACK_NAME`, and CORS allowed origins for the Web UI (the browser-coupling variables must track
each stack's own ports).

## Access Boundary

Docker localhost port mapping is the only access boundary. Every published port binds to `127.0.0.1`;
no service is reachable from the network. There is no authentication, session token, role, or
authorization check anywhere in the system — this is a deliberate single-developer-tool constraint,
not an omission. `participant_role` / `author_role` / `assignee_role` are descriptive metadata, never
access control. (See the [NFR](../nfr.md) "Security posture — no authentication (by design)" entry.)

## Ownership

The concrete infrastructure-as-code artifacts — `docker-compose.yml`, `deploy.sh`, the backend and
frontend `Dockerfile`s (and their entrypoint / nginx config), and the `.env.example` /
`.env.dev.example` templates — are owned by **devops**. This document is the system-level topology
view; it does not restate their contents.

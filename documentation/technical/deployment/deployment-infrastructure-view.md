# Deployment / Infrastructure View

System-level deployment topology for the AI Agent Coordination Utility. This is the current-state
topology view — the concrete infrastructure-as-code (Compose, deploy script, Dockerfiles, env
templates) is owned by devops (see § Ownership), not restated here.

## Overview

There is a single environment: the developer's local machine. The whole stack runs under Docker
Compose, with every published port bound to `127.0.0.1` (localhost). Nothing is exposed off the
machine. The access boundary is this machine — the localhost port binding, plus Docker networks the
stack deliberately exposes to other containers on the same Docker daemon (ADR-033) — and there is no
authentication, by deliberate design (single-developer personal tool). See § Access Boundary and
§ Networks.

## Services & Topology

| Service | Container | Default host port | Exposure |
|---------|-----------|-------------------|----------|
| Backend (REST + MCP) | FastAPI on a single Uvicorn process; the MCP server is path-mounted on the same app at `/mcp/v1` (one instance per version under `/mcp/<version>`, ADR-032), not a separate port | 8000 | localhost only |
| Web UI | nginx serving the static React (Vite) build | 3000 | localhost only |
| PostgreSQL | PostgreSQL container, run under the `postgres` Compose profile | 5432 | localhost only |
| In-network Web UI | A second instance of the Web UI — same build, but its baked backend address is the backend's container-network name instead of `localhost`, so a browser running inside another container can use it. Prod: `web-docker`; dev: `web-agent` | — | Docker network only (no host port); see § Networks |

The backend serves both access surfaces from one port over a shared service layer: the REST API for
the Web UI and the MCP server for AI agents. The Web UI container never talks to MCP — it consumes
the REST contract only. The PostgreSQL container is present only when the database is PostgreSQL
(the deployment default); in the SQLite opt-in there is no `db` container.

The two Web UI instances in a stack differ only in which backend address their build carries: the
host-facing instance points at the backend's localhost port, the in-network instance at the backend's
name on a stack-owned network (§ Networks). Each stack runs exactly one in-network instance, attached
to that stack's network only.

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
project naming — except for the stack-owned networks in § Networks, which carry fixed names on
purpose and are each created by one stack only. The two things Compose does not namespace are covered
by configuration:

- **Host ports** are env-configurable — `BACKEND_PORT`, `WEB_PORT`, `POSTGRES_PORT` — with the
  canonical values as defaults; container-internal ports stay fixed.
- **`STACK_NAME`** namespaces the built image tags per stack (default `prod`).

Two committed env templates align to this model: `.env.example` (prod — `STACK_NAME=prod`, canonical
ports 8000/3000/5432, PostgreSQL) and `.env.dev.example` (dev — `STACK_NAME=dev`, offset ports
8100/3100/5433, SQLite, with the browser-coupling variables pre-matched to the offset ports). Each
stack that uses PostgreSQL runs its own database container (no shared server).

## Networks

Besides each stack's own project-scoped default network (all its services, isolated per checkout),
two stack-owned networks have fixed names so containers outside the stack can join them. Each belongs
to exactly one stack; the other stack never creates or joins it.

| Network | Stack | Members (name on the network) | Consumers | Purpose |
|---|---|---|---|---|
| `aiacu-agent-access-dev` | dev only | Backend (`backend`), host-facing Web UI (`web`), in-network Web UI (`web-agent`) | This project's own devcontainer | Agents developing this project reach the dev stack — REST, MCP, and a browser-loadable UI |
| `aiacu-external-access` | prod only | Backend (`aiacu-backend`), in-network Web UI (`aiacu-web`) | Devcontainers of other projects on this machine, joining it as an external network by name | Other projects' agents use the Task Manager — REST `/v1` and MCP `/mcp/v1` at the backend alias, and the UI at the Web UI alias (for a browser such as Playwright) |

- **PostgreSQL is on neither network**, and the prod host-facing Web UI is not on
  `aiacu-external-access` — each network carries only what its consumers call.
- **Aliases on `aiacu-external-access` are project-unique** (`aiacu-` prefix), so they cannot collide
  with other projects' own service names on the same shared network.
- **The name is stable across `down`/`up`** and across checkout folder names, so consumers never
  change their own configuration. The prod stack must be up before a consumer starts.
- **The backend accepts browser requests from both prod Web UI origins** — the host-facing one and the
  in-network one (§ Configuration).
- **A dev checkout must be started only through the deploy entry point.** Started any other way, the
  dev stack would also join `aiacu-external-access` under the same aliases, and Docker DNS would
  silently split other projects' calls between the prod and dev backends.

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
each stack's own ports). The prod stack allows two origins — the host-facing Web UI and the in-network
Web UI on `aiacu-external-access`.

## Access Boundary

The access boundary is this machine: the localhost port binding, plus Docker networks the stack
deliberately exposes to other containers on the same Docker daemon (§ Networks, ADR-033). Every
published port binds to `127.0.0.1`; no service is reachable from off the machine. Joining a Docker
network requires access to the local Docker daemon, which already grants control of the machine — so
the network path widens *how* the backend is reached, not *who* can reach it. There is no
authentication, session token, role, or authorization check anywhere in the system — this is a deliberate single-developer-tool constraint,
not an omission. `participant_role` / `author_role` / `assignee_role` are descriptive metadata, never
access control. (See the [NFR](../nfr.md) "Security posture — no authentication (by design)" entry.)

## Ownership

The concrete infrastructure-as-code artifacts — `docker-compose.yml`, `deploy.sh`, the backend and
frontend `Dockerfile`s (and their entrypoint / nginx config), and the `.env.example` /
`.env.dev.example` templates — are owned by **devops**. This document is the system-level topology
view; it does not restate their contents.

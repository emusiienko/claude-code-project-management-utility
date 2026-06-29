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

## Gotchas
- **No auth, by design.** Docker localhost port mapping is the only access boundary. Never add login/roles/RBAC. `*_role` fields are descriptive metadata, not access control.
- **DB is configurable (SQLite default | PostgreSQL) via `DATABASE_URL`.** Keep all code DB-agnostic; dialect-specific logic (JSON `labels` filters, UUID type, case-insensitive uniqueness) stays inside the data layer. SQLite must run in WAL mode.
- **REST and MCP share one service layer.** Put business logic in the app `service`, never in a controller or MCP tool. Both surfaces must stay behavior-identical.
- **Attachment content lives on the filesystem** (attachments Docker volume), not in the DB. `file_path` is server-internal and must never appear in API responses. Documents/images are archived, never deleted; only external-ref is deletable.
- **The utility stores facts; it never enforces process** — no blocking on dependencies, no workflow automation, no status transition rules.
- **API contract is LOCKED at v1.0** — do not change shapes without an architect-approved revision.

1# DevOps Strategy — AI Agent Coordination Utility

> **Status:** Draft — pending user approval
> **Date:** 2026-06-29
> **Owner:** devops

This strategy is deliberately **right-sized** for what the architecture defines: a single-developer,
single-machine, localhost-only utility with **no authentication**, run as a Docker Compose stack
(see `docs/architecture.md` and ADR-002, ADR-003, ADR-004). There is **no cloud provider, no remote
environments, no IAM, and no secrets to manage**. Sections of a generic cloud DevOps strategy that do
not apply here are explicitly marked **Not applicable (V1)** rather than padded with ceremony.

> **Assumptions made (no interactive approval was possible during setup).** Confirm or correct these
> when you review:
> - **Quality gates**: local **pre-commit hooks** (lint, format, type-check). No CI service — for a
>   solo, localhost-only repo, pre-commit hooks are sufficient and keep the toolchain off any
>   external runner.
> - **Branch model**: `main` + short-lived feature branches (`feat/` `fix/` `chore/`), matching the
>   conventions docs. No `develop` branch — unnecessary for a solo project.
> - **Deploy**: `deploy.sh` is a thin wrapper over `docker compose` (build → migrate → up), with the
>   SQLite/PostgreSQL switch handled by `DATABASE_URL` + a Compose profile. PostgreSQL is the
>   **default**; SQLite is an opt-in alternative.

---

## Scope & Non-Goals

**In scope (V1)**
- Local Docker Compose stack: `backend` (single service serving **both** REST and MCP on the same
  port :8000 via path-based routing), `web` (nginx + React build :3000), `db` (PostgreSQL 18, default).
- A single deployment/run entry point: `deploy.sh`.
- DB-agnostic operation: PostgreSQL (**default**) or SQLite (opt-in, no container).
- Alembic migrations run as part of bringing the stack up.
- Local quality gates via **pre-commit hooks** (lint, format, type-check) — no test execution, owned by QA roles.
- `.gitignore`, `.env.example`, and repository hygiene.

**Not applicable (V1)** — recorded so future-me does not re-derive them:
- Cloud provider, regions, VPC/subnets, security groups — **none**; the stack is localhost-only.
- IAM / least-privilege roles, service accounts — **none**; no cloud, no auth.
- Secrets management (Secrets Manager / Key Vault) — **none**; there are no secrets (no auth, local-only). The only "credential" is a local PostgreSQL password used solely between containers on the host.
- Multi-environment cloud deploys (dev/staging/prod), DNS/domains, TLS certs, container registry — **none**; nothing is published off the developer machine.
- Branch-protection rules via Terraform/`gh` — **deferred**; a solo repo does not need enforced protection. Convention (PR-only) is documented, not mechanically enforced.

If V2 ever exposes this tool beyond `localhost`, this document must be revisited: auth, TLS, secrets, and a real environment model would all become in scope.

---

## Environments

There is exactly **one** environment: the developer's local machine. "dev" and "prod" are the *same*
stack; the only difference is the `DATABASE_URL` (PostgreSQL default vs SQLite opt-in) and log
verbosity, per the architecture's "same image, env-only differences" rule.

| Environment | Purpose | Runs on | Brought up by |
|---|---|---|---|
| local | The only environment — development and personal use | Developer machine (Docker Compose, localhost) | `./deploy.sh up` |

---

## Branch Strategy

- `main` — the single long-lived branch (always runnable)
  - `feat/<slug>` — new capability
  - `fix/<slug>` — defect fix
  - `chore/<slug>` — tooling, docs, infra

Rules (by convention — matches `backend-coding-conventions.md` and `frontend-coding-conventions.md`):
- Conventional Commits: `type(scope): short description` (types: feat, fix, chore, refactor, docs, test).
- Changes land on `main` via PR; no `--no-verify`, no force-push to `main`.
- Enforcement is **social, not mechanical** in V1 (solo repo). If you later want hard enforcement,
  the cheapest path is GitHub branch-protection via `gh api` — noted, not implemented now.

No `develop` branch: a second protected integration branch adds ceremony with no payoff for a
single developer with one environment.

---

## Containerisation & Stack Topology

The whole system is one Docker Compose project. All ports are mapped to `127.0.0.1` only — never
`0.0.0.0` — so nothing is reachable off the host. This port mapping **is** the access boundary
(there is no auth by design).

| Service | Image source | Port (localhost) | Notes |
|---|---|---|---|
| `backend` | Built from `backend/` | `8000` | Single FastAPI/Uvicorn process serving **both** the REST surface and the MCP server. MCP HTTP streamable transport is mounted on a path of the same app (e.g. `/mcp`), not a separate port — the `api-contract.md` defines no distinct MCP port (ADR-003). |
| `web` | Built from `frontend/` (multi-stage: Vite build → nginx) | `3000` | Serves the static SPA; single web entry. |
| `db` | `postgres:18` | `5432` | **Default** database. Started by default; absent only when `DATABASE_URL` is switched to SQLite (the `postgres` profile is active by default) (ADR-002). |

Volumes (named, managed by Compose):
- `attachments` → mounted at `ATTACHMENTS_DIR` in `backend`; holds attachment files + version snapshots (ADR-005). Outside any web root.
- `pg_data` → PostgreSQL data dir; active by default.
- `sqlite_data` → holds `app.db` only when `DATABASE_URL` is switched to SQLite (so the database survives `down`).

REST and MCP run in the **same container, same image, same process** — MCP is a sub-application
mounted on a path of the REST app, sharing the service layer in-process (ADR-003). There is no
separate `mcp` service or port. This is acceptable — indeed preferable — for a single-machine tool:
one build, one process, one port to reason about.

---

## Database & Migrations

- **Default:** PostgreSQL 18 in the `db` container. `DATABASE_URL=postgresql+psycopg://…` is the
  default in `.env.example` and `deploy.sh`; the `postgres` Compose profile is active by default so
  the `db` container starts automatically.
- **SQLite (opt-in alternative):** enabled by switching `DATABASE_URL` to a SQLite path and
  deactivating the `postgres` profile; the file lives on the `sqlite_data` volume in **WAL mode**
  (required to meet the ≥5 concurrent-request target — ADR-002), with no `db` container.
- **Migrations:** `alembic upgrade head` runs automatically inside `deploy.sh` *after* the database
  is reachable and *before* the `backend` service starts serving. The same Alembic scripts run on
  both dialects (dialect-aware where unavoidable — ADR-002). The `system_settings` seed ships as an
  Alembic data migration, so a fresh install needs no manual configuration.
- **Startup ordering (PostgreSQL, default):** `deploy.sh` waits for the `db` healthcheck before
  running migrations; on SQLite there is no wait.

---

## Configuration & "Secrets"

12-factor: all configuration is read from environment variables. There are **no application secrets**
(no auth, local-only — `docs/architecture.md` § Authentication / Environment Configuration).

- `.env.example` is committed and lists every variable with safe placeholder values.
- `.env` is **git-ignored** and holds the developer's local values.
- Variables (from the architecture):
  - `DATABASE_URL` — dialect switch (PostgreSQL **default** | SQLite opt-in).
  - `ATTACHMENTS_DIR` — attachments volume mount path.
  - `CORS_ALLOWED_ORIGINS` — localhost origins for the Web UI.
  - Service ports (`8000` backend — REST + MCP on the same port, `3000` Web) — defaults; final mapping owned here in `docker-compose.yml`.
- The **only** sensitive-looking value is the local PostgreSQL password (`POSTGRES_PASSWORD`), used by
  default. It is used only between containers on the host, lives only in the git-ignored `.env`, and
  is never transmitted off the machine. A cloud secret manager would be over-engineering here.

---

## Pre-commit Hooks

There is **no CI service**. For a solo, localhost-only project, quality gates run **locally as
pre-commit hooks** — fast, zero external runners, and consistent with the "no `--no-verify`"
convention. Hooks run automatically on `git commit` over staged files; they do **not** run tests
(test execution and its tooling are owned by **qa-automation** — `docs/qa-automation-strategy.md`,
not yet written).

Managed with the [`pre-commit`](https://pre-commit.com) framework via a committed
`.pre-commit-config.yaml`. Install once per clone with `pre-commit install`.

Hooks:

- **backend** (`backend/**.py`)
  - Format: `black` (auto-fix) + `isort` (auto-fix) (per backend conventions).
  - Lint: `ruff` / flake8 as named by the conventions.
  - Type check: `mypy` (backend conventions mandate full type hints).
  - Tests
- **frontend** (`frontend/**.{ts,tsx,js,jsx,css}`)
  - Format: `prettier` (auto-fix, incl. the Tailwind class-order plugin per frontend conventions).
  - Lint: `eslint`.
  - Type check: `tsc --noEmit`.
  - Tests
- **repo-wide**
  - Trailing-whitespace, end-of-file-fixer, large-file guard, and a check that `.env` is never staged.

Exact tool invocations track the conventions docs — if a convention names a different tool, the hook
config follows the convention, which is the source of truth. A developer can run the full set on
demand with `pre-commit run --all-files`.

> The hooks are a *local* gate, not a mechanical server-side one. If V2 ever needs enforced,
> server-side checks (e.g. on shared branches), reintroducing a CI workflow that runs the same
> commands is the cheapest path — the *checks* would be identical, only the trigger differs.

---

## Deployment / Run

There is no remote deploy. "Deploy" means *bring the local stack up*. A single documented entry
point hides the Compose details and the DB-dialect branching.

`deploy.sh` — usage:

```
./deploy.sh up        # build, run migrations, start the whole stack (foreground logs optional)
./deploy.sh down      # stop the stack (volumes preserved)
./deploy.sh rebuild   # rebuild images from scratch, then up
./deploy.sh migrate   # run alembic upgrade head only
./deploy.sh logs      # tail stack logs
```

Behaviour:
- Reads `DATABASE_URL` from `.env`. **Default** targets PostgreSQL: the script activates the
  `postgres` Compose profile and waits for the `db` healthcheck. If `DATABASE_URL` is switched to
  SQLite, the script skips the profile and runs with no `db` container.
- Always runs `alembic upgrade head` before the `backend` service (REST + MCP, same process) starts serving.
- The user runs `deploy.sh`; the devops agent never runs it autonomously.

This is intentionally a thin, readable wrapper over `docker compose` — no orchestration tool, no
remote state, no CD trigger. Smallest footprint that gives one obvious command.

---

## Rollback / Recovery (minimal-infra)

Matched to a single-machine tool — native primitives, one retained artifact, manual runbook:

1. **Code rollback:** `git checkout <last-good-tag>` (tag releases you care about) then
   `./deploy.sh rebuild`.
2. **Schema rollback:** `alembic downgrade -1` (or to a target revision) — Alembic is the single
   source of schema truth on both dialects.
3. **Data safety:** the `attachments`, `sqlite_data`, and `pg_data` volumes are **not** removed by
   `./deploy.sh down`. A destructive reset requires an explicit `docker compose down -v` (documented,
   never scripted into `deploy.sh`).
4. **Backup (optional, manual):** copy the `sqlite_data` volume file, or `pg_dump` the Postgres
   volume, before a risky migration. No automated backup job in V1 — single user, local data.

---

## Repository Hygiene

- `.gitignore` covers: `.env`, `__pycache__/`, `*.pyc`, `.venv/`, `node_modules/`, `dist/`,
  `frontend` build output, local SQLite files outside the volume, `.idea/`/editor cruft, and any
  `data/` scratch dir.
- `.env.example` committed; `.env` never committed.
- `README.md` quick-start points at `./deploy.sh up`.

---

## Ownership

| Area | Owner |
|---|---|
| `docker-compose.yml`, `deploy.sh`, `.pre-commit-config.yaml`, `.gitignore`, `.env.example` | devops |
| Backend Dockerfile (`backend/`) | devops (build), backend-developer (app contents) |
| Frontend Dockerfile (`frontend/`) | devops (build), frontend-developer (app contents) |
| Alembic migration **scripts** | backend-developer (authoring) — devops only runs them via `deploy.sh` |
| Test tooling | qa-automation (`docs/qa-automation-strategy.md`) |
| Running `deploy.sh` | user |
| `CLAUDE.md` § Infrastructure | devops |

---

## Open Items for User Confirmation

1. **Quality gates** — confirmed: local **pre-commit hooks**, no CI service.
2. **Branch model** — assumed: `main` + feature branches, no `develop`.
3. **`deploy.sh` as a Compose wrapper** — assumed: yes, with **PostgreSQL default** / SQLite opt-in switch.
4. **Single backend container** — confirmed: REST + MCP share one image and one process on port :8000
   (MCP mounted on a path; no separate MCP port, per `api-contract.md`).

Once approved, the scaffold (`docker-compose.yml`, `deploy.sh`, `.pre-commit-config.yaml`,
`.gitignore`, `.env.example`, Dockerfiles) is created under the next devops implementation task and
`CLAUDE.md` § Infrastructure is filled in.

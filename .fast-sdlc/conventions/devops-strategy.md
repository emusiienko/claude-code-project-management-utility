1# DevOps Strategy — AI Agent Coordination Utility

> **Status:** Adopted — as-built (branch model updated 2026-08-27, STORY-001/TASK-005)
> **Date:** 2026-06-29 · **Last updated:** 2026-08-27
> **Owner:** devops
> **Location:** `.fast-sdlc/conventions/devops-strategy.md` — the shared conventions folder (alongside
> `coding-conventions-backend.md` / `coding-conventions-frontend.md`), so any role can read it without
> reaching into another role's config folder. Relocated from legacy `docs/devops-strategy.md` via
> `git mv` during TASK-005 — history preserved.

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
> - **Branch model**: ~~`main` + short-lived feature branches, no `develop`~~ — **superseded
>   2026-08-27 (STORY-001/TASK-005)**: the project now uses the **`to-development`** model —
>   `main` (release) + `development` (integration) + short-lived `feat/` `fix/` `chore/` branches
>   off `development`. `main` receives merges only from `development`. See § Branch Strategy.
> - **Deploy**: `deploy.sh` is a thin wrapper over `docker compose` (build → migrate → up), with the
>   SQLite/PostgreSQL switch handled by `DATABASE_URL` + a Compose profile. *(Corrected in TASK-006:
>   the setup-time draft assumed Postgres default, but the implemented backend config
>   (`app.core.config`) defaults to SQLite — code is the source of truth.)* **STORY-024 amendment
>   (2026-08-01):** by user direction, the **deployment** default is now **PostgreSQL** — the shipped
>   `.env.example` (the "prod" stack) sets `DATABASE_URL` to the Postgres URL and `deploy.sh` falls
>   back to it, so `postgres` profile activates out of the box. SQLite stays a fully-supported opt-in
>   (and remains the backend code's built-in fallback, used only when no `DATABASE_URL` is provided at
>   all — which the shipped env never leaves unset). The new `.env.dev.example` (the "dev" stack) uses
>   SQLite by default. See § Running Two Stacks Concurrently.

---

## Scope & Non-Goals

**In scope (V1)**
- Local Docker Compose stack: `backend` (single service serving **both** REST and MCP on the same
  port :8000 via path-based routing), `web` (nginx + React build :3000), `db` (PostgreSQL 18, opt-in).
- A single deployment/run entry point: `deploy.sh`.
- DB-agnostic operation: PostgreSQL (**deployment default**, `postgres` profile) or SQLite (opt-in, no container). *(STORY-024 flipped the deployment default from SQLite to Postgres — see the assumptions note above.)*
- Alembic migrations run as part of bringing the stack up.
- Local quality gates via **pre-commit hooks** (lint, format, type-check) — no test execution, owned by QA roles.
- `.gitignore`, `.env.example`, and repository hygiene.

**Not applicable (V1)** — recorded so future-me does not re-derive them:
- Cloud provider, regions, VPC/subnets, security groups — **none**; the stack is localhost-only.
- IAM / least-privilege roles, service accounts — **none**; no cloud, no auth.
- Secrets management (Secrets Manager / Key Vault) — **none**; there are no secrets (no auth, local-only). The only "credential" is a local PostgreSQL password used solely between containers on the host.
- Multi-environment cloud deploys (dev/staging/prod), DNS/domains, TLS certs, container registry — **none**; nothing is published off the developer machine.
- Branch-protection rules via Terraform/`gh` — **deferred**; a solo repo does not need enforced protection. Convention (PR-only into `development`, `development`→`main` promotion) is documented, not mechanically enforced.

If V2 ever exposes this tool beyond `localhost`, this document must be revisited: auth, TLS, secrets, and a real environment model would all become in scope.

---

## Environments

There is exactly **one** environment: the developer's local machine. The optional "prod" and "dev"
concurrent stacks (STORY-024) run the *same* image; they differ only by env — host ports, image tag
(`STACK_NAME`), and `DATABASE_URL` (the prod stack defaults to PostgreSQL; the dev stack to SQLite),
per the architecture's "same image, env-only differences" rule. See § Running Two Stacks Concurrently.

| Environment | Purpose | Runs on | Brought up by |
|---|---|---|---|
| local | The only environment — development and personal use | Developer machine (Docker Compose, localhost) | `./deploy.sh up` |

---

## Branch Strategy

**Model: `to-development`** (set 2026-08-27, STORY-001/TASK-005, by user direction — recorded in
`fast-sdlc-project-setup.md` > Pull Requests). This supersedes the earlier setup-time assumption of a
single `main` branch with no integration branch.

Two long-lived branches:

- `main` — the **release** branch; always runnable. Receives merges **only** from `development`,
  **never** directly from an Acceptance/Reconcile Pull Request. A promotion to `main` is a deliberate
  release step, done by the user.
- `development` — the **integration** branch. All story/reconcile Pull Requests target `development`.
  This is where accepted work accumulates until it is promoted to `main`.
  - `feat/<slug>` — new capability (branched off `development`)
  - `fix/<slug>` — defect fix (branched off `development`)
  - `chore/<slug>` — tooling, docs, infra (branched off `development`)

Flow: `feat|fix|chore/<slug>` → PR → `development` → (release) → `main`.

Rules (by convention — matches `coding-conventions-backend.md` and `coding-conventions-frontend.md`):
- Conventional Commits: `type(scope): short description` (types: feat, fix, chore, refactor, docs, test).
- Short-lived branches land on `development` via PR; `development` promotes to `main` via a separate
  merge. No `--no-verify`; no force-push to `main` or `development`.
- Enforcement is **social, not mechanical** in V1 (solo repo). If you later want hard enforcement,
  the cheapest path is GitHub branch-protection via `gh api` on both `main` and `development` — noted,
  not implemented now.

The `development` branch was created off `main` during TASK-005. Because the branch model change is
what motivated this update, the single-`main` rationale from the setup-time draft no longer applies.

---

## Containerisation & Stack Topology

The whole system is one Docker Compose project. All ports are mapped to `127.0.0.1` only — never
`0.0.0.0` — so nothing is reachable off the host. This port mapping **is** the access boundary
(there is no auth by design).

| Service | Image source | Port (localhost) | Notes |
|---|---|---|---|
| `backend` | Built from `backend/` | `8000` | Single FastAPI/Uvicorn process serving **both** the REST surface and the MCP server. MCP HTTP streamable transport is mounted on a path of the same app (e.g. `/mcp`), not a separate port — the `api-contract.md` defines no distinct MCP port (ADR-003). |
| `web` | Built from `frontend/` (multi-stage: Vite build → nginx) | `3000` | Serves the static SPA; single web entry. |
| `db` | `postgres:18` | `5432` | **Default** database (STORY-024). Started under the `postgres` Compose profile, which `deploy.sh` activates automatically because the shipped `.env` targets Postgres; absent when `DATABASE_URL` is switched to the SQLite opt-in (ADR-002). |

Volumes (named, managed by Compose):
- `attachments` → mounted at `ATTACHMENTS_DIR` in `backend`; holds attachment files + version snapshots (ADR-005). Outside any web root.
- `sqlite_data` → holds `app.db` on the SQLite opt-in (mounted at `/app/backend/data`, so the database survives `down`).
- `pg_data` → PostgreSQL data dir; populated only under the `postgres` profile.

REST and MCP run in the **same container, same image, same process** — MCP is a sub-application
mounted on a path of the REST app, sharing the service layer in-process (ADR-003). There is no
separate `mcp` service or port. This is acceptable — indeed preferable — for a single-machine tool:
one build, one process, one port to reason about.

---

## Database & Migrations

- **Deployment default:** PostgreSQL (STORY-024). `DATABASE_URL=postgresql+psycopg://app:app@db:5432/app`
  is the uncommented value in `.env.example` (the "prod" stack) and the fallback in `deploy.sh` and the
  Compose interpolation, so `deploy.sh up` activates the `postgres` profile and starts the `db`
  container (PostgreSQL 18) out of the box. *(The backend code `app.core.config` still carries a SQLite
  built-in fallback for the case where no `DATABASE_URL` is set at all; the shipped `.env` never leaves
  it unset, so the effective deployment default is Postgres.)*
- **SQLite (opt-in alternative):** enabled by switching `DATABASE_URL` to `sqlite:///data/app.db`
  (commented in `.env.example`; the default in `.env.dev.example`). The file lives on the `sqlite_data`
  volume in **WAL mode** (required to meet the ≥5 concurrent-request target — ADR-002), with no `db`
  container and no profile.
- **Migrations:** `alembic upgrade head` runs automatically — both inside the backend container's
  entrypoint (so a bare `docker compose up` is correct) and explicitly in `deploy.sh` *after* the
  database is reachable and *before* the `backend` service starts serving. The same Alembic scripts
  run on both dialects (dialect-aware where unavoidable — ADR-002). The `system_settings` seed ships
  as an Alembic data migration, so a fresh install needs no manual configuration.
- **Startup ordering (PostgreSQL default):** `deploy.sh` starts `db` and waits for its healthcheck
  before running migrations; on the SQLite opt-in there is no `db` container and no wait.

---

## Configuration & "Secrets"

12-factor: all configuration is read from environment variables. There are **no application secrets**
(no auth, local-only — `docs/architecture.md` § Authentication / Environment Configuration).

- **Two committed templates** (STORY-024): `.env.example` is the **prod** stack (canonical ports,
  PostgreSQL default); `.env.dev.example` is the **dev** stack (offset ports, SQLite). Both list every
  variable with safe placeholder values. Copy the one matching a checkout's role to that checkout's
  `.env` (`cp .env.example .env` for prod — also what `deploy.sh` bootstraps automatically —
  or `cp .env.dev.example .env` for a concurrent dev checkout).
- `.env` is **git-ignored** and holds the developer's local values.
- Variables (from the architecture):
  - `DATABASE_URL` — dialect switch (PostgreSQL **default** | SQLite opt-in).
  - `ATTACHMENTS_DIR` — attachments volume mount path.
  - `CORS_ALLOWED_ORIGINS` — localhost origins for the Web UI.
  - Host ports (`BACKEND_PORT` `8000` — REST + MCP on the same port, `WEB_PORT` `3000`, `POSTGRES_PORT` `5432`) and `STACK_NAME` (`prod`) — env-configurable (STORY-024) so two checkouts can run concurrently; the `.env.example` defaults are the prod stack. See § Running Two Stacks Concurrently.
- The **only** sensitive-looking value is the local PostgreSQL password (`POSTGRES_PASSWORD`), used
  only when the Postgres profile is active. It is used only between containers on the host, lives only
  in the git-ignored `.env`, and is never transmitted off the machine. A cloud secret manager would be
  over-engineering here.

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
  `postgres` Compose profile, starts `db`, and waits for its healthcheck before migrating. If
  `DATABASE_URL` is switched to the SQLite opt-in, the script runs with no `db` container.
- Always runs `alembic upgrade head` before the `backend` service (REST + MCP, same process) starts serving.
- The user runs `deploy.sh`; the devops agent never runs it autonomously.

This is intentionally a thin, readable wrapper over `docker compose` — no orchestration tool, no
remote state, no CD trigger. Smallest footprint that gives one obvious command.

---

## Running Two Stacks Concurrently (dual local deployment)

Added in **STORY-024**. The developer can run two independent stacks on the same machine at once —
typically a stable **"prod"** stack (a separate checkout of a released version, e.g. `main`) plus
the active **"dev"** checkout — to keep a stable instance up while developing against a second one.

Each stack has its **own committed env template** (STORY-024): the prod checkout copies `.env.example`
(canonical ports, PostgreSQL) to its `.env`; the dev checkout copies `.env.dev.example` (offset ports,
SQLite) to its `.env`. There are no commented alternate blocks to hand-edit — the two files are the
two ready-to-use configs.

**Why this works with almost no new machinery.** Docker Compose already namespaces **containers,
networks, and named volumes** by *project name*, which defaults to the compose file's containing
**folder basename**. Two checkouts in differently-named folders therefore get fully isolated
containers and volumes (`sqlite_data`, `pg_data`, `attachments`) for free — this is the same
mechanism, not a new one. The only things Compose does **not** namespace, and which STORY-024 makes
configurable, are:

- **Host port bindings** — two stacks can't both publish `127.0.0.1:8000` (etc.). Now driven by
  `BACKEND_PORT` / `WEB_PORT` / `POSTGRES_PORT` (prod `8000` / `3000` / `5432`; dev `8100` / `3100` /
  `5433`). Only the host side is variable; container-internal ports stay fixed, so nothing inside the
  stack changes.
- **Built image tags** — `aiacu-backend` / `aiacu-web`. The **web** image bakes `VITE_API_BASE_URL`
  at build time, so a shared tag would let the two stacks overwrite each other's web image. Now
  namespaced by `STACK_NAME` (prod `prod`, dev `dev`), so each stack owns its images.

### How to stand up a second (dev) stack

1. Clone or download the second version into a **differently-named folder** (the different basename
   is what gives it a distinct Compose project — and thus separate containers/volumes/networks).
   Example: keep the released version in `aiacu-prod/`, put the working checkout in `aiacu-dev/`.
2. In the dev checkout, create its `.env` from the dev template: `cp .env.dev.example .env`.
   (The prod checkout uses `.env.example` — `./deploy.sh` bootstraps that automatically on first run.)
3. `.env.dev.example` already carries the **six interdependent values** so nothing collides with the
   prod stack; the example offsets the app ports by +100 and Postgres by +1:
   - `STACK_NAME=dev` — own image tags (`aiacu-*:dev`), no shared-tag overwrite.
   - `BACKEND_PORT=8100` — own backend host port.
   - `WEB_PORT=3100` — own web host port.
   - `POSTGRES_PORT=5433` — own Postgres host port (only relevant if the dev stack switches to Postgres).
   - `VITE_API_BASE_URL=http://localhost:8100` — **must** equal `http://localhost:<BACKEND_PORT>`;
     baked into the SPA at build time, so the browser calls the right backend.
   - `CORS_ALLOWED_ORIGINS=http://localhost:3100` — **must** include `http://localhost:<WEB_PORT>`,
     or the browser's API calls are blocked by CORS.
4. Run `./deploy.sh up` in **each** checkout. `deploy.sh` is unchanged and unaware of these
   variables — Compose auto-loads each folder's `.env` for interpolation. The prod stack keeps its
   defaults; the single-stack workflow is entirely unaffected.

The prod stack runs **PostgreSQL** (its `.env.example` default) and the dev stack runs **SQLite**
(its `.env.dev.example` default), so out of the box the two don't even contend for a Postgres host
port. Either stack can switch dialect independently by editing only its own `.env`. If the dev stack
is switched to Postgres, its internal `DATABASE_URL` stays `postgresql+psycopg://app:app@db:5432/app`:
that targets the dev project's *own* `db` service on its private network, so it does not need to
differ; `POSTGRES_PORT` (5433) only affects the host-published port used for external `psql`
inspection. Migrations and the `deploy.sh` subcommands are identical per stack.

If both stacks are accidentally left on identical default ports (the user forgets to override), the
second `./deploy.sh up` **fails fast** with a Docker `port is already allocated` error rather than
silently interfering with the already-running stack.

### The devops agent always operates in the dev checkout

The devops agent (and every implementor agent) is **only ever invoked inside the active working
checkout**, which is the **dev** stack. It does not choose, detect, or switch between stacks — there
is no mechanism for it to do so:

- The stack identity is fixed **by the user**, out of band, by copying one env template to `.env`
  before running the stack (`.env.dev.example` in the working checkout, `.env.example` in a separate
  prod checkout). `deploy.sh` takes **no** environment argument and does not branch on stack
  identity — it simply runs Compose against whatever `.env` the folder already has.
- A **"prod" stack is a separate checkout** (e.g. a standalone download of a released `main`) that the
  user manages and runs entirely on their own, in a different folder, with **no agent involvement
  there at all**. The devops agent never has a working directory in a prod checkout, so it cannot and
  does not touch, start, stop, rebuild, migrate, wipe, or send traffic to the prod stack.

Therefore, whenever any agent-run command needs a local stack — bringing it up, tailing logs,
inspecting containers/volumes, `curl`-ing an endpoint for troubleshooting or verification — it targets
the **dev** stack, because that is the only context it runs in:

- **Dev stack** (the only stack agents see): `.env.dev.example` → `STACK_NAME=dev`, backend/MCP on
  `http://localhost:8100`, Web UI on `http://localhost:3100`, Postgres host port `5433` (SQLite by
  default, so no Postgres container unless switched).
- **Prod stack** (out of scope for agents): `.env.example` → `STACK_NAME=prod`, backend/MCP on
  `http://localhost:8000`, Web UI on `http://localhost:3000`, Postgres host port `5432` — a separate,
  user-managed checkout the agent never enters.

**Why:** it is the user, not the agent, who converts an env template to `.env`, and `deploy.sh` is
fixed in that regard. There is no "pick the stack at runtime" step for the agent, so there is also no
"confirm before touching prod" scenario — a prod checkout is simply never the agent's working
directory. Keeping this explicit prevents an agent from reasoning about, or trying to reach, the
canonical `8000`/`3000`/`5432` ports when they belong to a separate instance the user may be running
live. (`deploy.sh` also remains user-run, never agent-run — see § Deployment / Run.)

### PostgreSQL: separate container per stack (decision)

The story left open whether two concurrent stacks that both use PostgreSQL should share one server
(distinct database names) or run fully separate containers. **Decision: separate container per
stack.** (With the shipped templates the prod stack uses Postgres and the dev stack SQLite, so this
only bites when the dev stack is switched to Postgres too.)

- Each Postgres stack gets its own `db` container and its own `pg_data` volume via folder-based
  project naming — full isolation, matching how a SQLite stack is already self-contained. The only
  added requirement is a distinct `POSTGRES_PORT` per stack, now supported.
- Sharing one server via distinct DB names was rejected: it would **couple the two stacks'
  lifecycles** (stopping or wiping the "prod" stack would take down "dev"'s database), require one
  checkout to own the server and the other to reach it over `host.docker.internal`, and introduce
  cross-stack state — more complexity and coupling for zero benefit on a single dev machine.
- Because the two `db` containers are separate servers, they may even keep the **same**
  `POSTGRES_DB`/`POSTGRES_USER` (`app`) — they never share storage.

### Verifying isolation (do not assume it)

Two levels, matching the story's "verify explicitly" requirement:

- **Config-level (done, no side effects).** `docker compose config` was rendered for both env
  templates (prod: `docker compose --env-file .env.example --profile postgres config`; dev:
  `docker compose --env-file .env.dev.example config`). Result: container-internal ports stay fixed
  at 8000/3000 (backend/web) in both; host-published ports are distinct and non-overlapping
  (prod 8000/3000/5432 with the `db` container present, dev 8100/3100 with **no** `db` container since
  it defaults to SQLite); image tags are distinct (`:prod` vs `:dev`); and the resolved backend
  `DATABASE_URL` is Postgres for prod, SQLite for dev. This proves the port, image-tag, and dialect
  isolation without building or binding anything.
- **Runtime data isolation (user-run, one-time).** To confirm volumes are isolated end-to-end:
  1. In the prod checkout (`.env.example` → `.env`, `STACK_NAME=prod`, ports 8000/3000) run
     `./deploy.sh up`; create a project via the Web UI at `http://localhost:3000` (or
     `POST http://localhost:8000/v1/projects`).
  2. In the dev checkout (`.env.dev.example` → `.env`, `STACK_NAME=dev`, ports 8100/3100) run
     `./deploy.sh up`; open `http://localhost:3100` and list projects — the project created in the
     prod stack must be **absent**.
  3. Create a different project in the dev stack; confirm it is absent from prod. Optionally confirm
     distinct volumes with `docker volume ls` — the names are prefixed by each folder's project name
     (e.g. `aiacu-dev_sqlite_data` vs `aiacu-prod_pg_data`).
  The two data sets never intersect because each stack's `sqlite_data` / `pg_data` / `attachments`
  volumes are separate Docker named volumes under separate Compose projects.

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
- `.env.example` (prod) and `.env.dev.example` (dev) committed; `.env` never committed.
- `README.md` quick-start points at `./deploy.sh up`.

---

## Ownership

| Area | Owner |
| --- | --- |
| `docker-compose.yml`, `deploy.sh`, `.pre-commit-config.yaml`, `.gitignore`, `.env.example`, `.env.dev.example` | devops |
| Backend Dockerfile (`backend/`) | devops (build), backend-developer (app contents) |
| Frontend Dockerfile (`frontend/`) | devops (build), frontend-developer (app contents) |
| Alembic migration **scripts** | backend-developer (authoring) — devops only runs them via `deploy.sh` |
| Test tooling | qa-automation (`docs/qa-automation-strategy.md`) |
| Running `deploy.sh` | user |
| `CLAUDE.md` § Infrastructure | devops |

---

## Open Items for User Confirmation

1. **Quality gates** — confirmed: local **pre-commit hooks**, no CI service.
2. **Branch model** — **confirmed (2026-08-27, STORY-001/TASK-005)**: `to-development` —
   `main` (release) + `development` (integration) + short-lived `feat/`/`fix/`/`chore/` branches off
   `development`; `main` merges only from `development`. Supersedes the earlier single-`main` assumption.
3. **`deploy.sh` as a Compose wrapper** — confirmed: yes, with a `DATABASE_URL` dialect switch.
   Deployment default is **PostgreSQL** (STORY-024, by user direction); **SQLite** is the opt-in and
   the `.env.dev.example` dev-stack default. *(Supersedes the earlier SQLite-default framing from
   TASK-006, which described the backend code fallback — still SQLite — not the deployment default.)*
4. **Single backend container** — confirmed: REST + MCP share one image and one process on port :8000
   (MCP mounted on a path; no separate MCP port, per `api-contract.md`).

Once approved, the scaffold (`docker-compose.yml`, `deploy.sh`, `.pre-commit-config.yaml`,
`.gitignore`, `.env.example`, Dockerfiles) is created under the next devops implementation task and
`CLAUDE.md` § Infrastructure is filled in.

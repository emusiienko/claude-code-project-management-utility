# Implementation Plan: STORY-024 — Dual Local Deployment (concurrent "live" + "dev" stacks)

> Authored by **devops** (this story skips the architect by explicit user direction —
> no separate architect handoff exists; this plan and its task breakdown are devops-authored
> in the architect's format).

## Context

The utility runs as a single local Docker Compose stack (SQLite default, PostgreSQL opt-in),
started via `./deploy.sh`. The developer now wants to run **two** independent stacks on the same
machine at once — a stable "live" checkout (e.g. a released `main`) plus the active "dev" checkout —
each in its own folder, each via its own `./deploy.sh up`.

Docker Compose already namespaces **containers, networks, and named volumes** by *project name*,
which defaults to the compose file's containing-folder basename. So two differently-named checkout
folders already get isolated containers/volumes/networks for free. What is **not** isolated today
and therefore blocks concurrent runs:

1. **Host port bindings are hardcoded** in `docker-compose.yml` — `127.0.0.1:8000` (backend
   REST+MCP), `127.0.0.1:3000` (web), `127.0.0.1:5432` (Postgres, opt-in). Two stacks binding the
   same host port cannot coexist. This is the collision the story names.
2. **Image tags are hardcoded and shared** — `aiacu-backend:local` and `aiacu-web:local`. Project
   naming does *not* namespace image tags. The **web** image bakes `VITE_API_BASE_URL` at *build*
   time, so two stacks that build `aiacu-web:local` with different backend URLs overwrite each
   other's image under one shared tag — a real, if narrow, foot-gun that would silently point one
   stack's web UI at the other stack's backend after a rebuild. (The backend image is
   env-agnostic — all its config is runtime — so its shared tag is harmless, but we namespace both
   for consistency and clarity.) This is a devops-discovered collision beyond the literal port ACs,
   necessary for two stacks to *actually work* concurrently.
3. **Browser-facing coupling** — because the SPA calls the backend directly from the browser, the
   web build's `VITE_API_BASE_URL` and the backend's `CORS_ALLOWED_ORIGINS` must track whatever
   host ports a stack uses. These are already env-driven; the work is to document and template the
   coupling so a second stack sets them correctly.

No business logic, API contract, or `deploy.sh` invocation changes are involved. `deploy.sh` needs
no edits at all: Compose auto-loads the per-folder `.env` for variable interpolation, so the new
variables resolve without the script knowing about them.

## Technical Approach

Make every cross-stack collision point a Compose-interpolated variable with a default equal to the
current fixed value, so a single-stack user is byte-for-byte unaffected and a second stack overrides
only its own `.env`.

- **Host ports** → `BACKEND_PORT` (8000), `WEB_PORT` (3000), `POSTGRES_PORT` (5432). Only the
  *host* side of each mapping is parameterized; the **container-internal** ports stay fixed (8000 /
  3000 / 5432), so inter-container networking (web→backend via the `db`/`backend` service names),
  `depends_on`, and healthchecks are untouched.
- **Image tags** → `STACK_NAME` (default `local`) parameterizes both image tags
  (`aiacu-backend:${STACK_NAME}`, `aiacu-web:${STACK_NAME}`). A second stack sets `STACK_NAME=dev`,
  giving it its own images and eliminating the shared-tag overwrite. Default `local` keeps existing
  single-stack image names identical.
- **Browser coupling** → keep the existing `VITE_API_BASE_URL` and `CORS_ALLOWED_ORIGINS` variables
  (no compose change needed — already interpolated) and template them in `.env.example` next to the
  ports, with a ready-to-copy commented "second concurrent stack" block so all five values move
  together.
- **Container/volume/network isolation** stays as the story frames it — folder-based project naming
  — and is **verified explicitly** rather than assumed (AC requirement), via `docker compose config`
  rendering (safe, no build/run) plus a documented runtime data-isolation procedure.

**PostgreSQL open question (resolved):** two concurrent stacks each run their **own** `db`
container against their **own** `pg_data` volume (folder-namespaced), publishing on distinct
`POSTGRES_PORT` host ports. We do **not** share a single Postgres server across stacks via distinct
database names — that would couple the two stacks' lifecycles (stopping "live" would kill "dev"'s
database) and add cross-stack state for zero benefit on one dev machine. The internal
`DATABASE_URL` stays `postgresql+psycopg://app:app@db:5432/app` in both stacks (it targets each
project's *own* `db` service on the container network); `POSTGRES_PORT` only affects the host-side
publish used for external `psql` inspection. Documented in `docs/devops-strategy.md`.

## Ordered Tasks

1. **TASK-001: Parameterize host ports and image tags in Compose + `.env.example`** — introduce
   `BACKEND_PORT`/`WEB_PORT`/`POSTGRES_PORT`/`STACK_NAME` (defaults matching today), template the
   browser-coupling vars, add a copy-paste second-stack block. Verify with `docker compose config`
   that both a default `.env` and a second-stack `.env` render distinct, non-overlapping host ports
   and image tags.
2. **TASK-002: Document the two-stack workflow and isolation verification** (depends on TASK-001) —
   add the dual-deployment section to `docs/devops-strategy.md` (workflow, exact `.env` deltas, the
   Postgres decision, a runtime data-isolation verification procedure), and refresh
   `CLAUDE.md` § Infrastructure and the `README.md` deployment/resources section.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Env-configurable host ports + per-stack image tags for concurrent local stacks | Confirm at Reconcile as the durable pattern for multi-stack local deployment |
| Separate Postgres container per stack (vs. shared server / distinct DBs) | Confirm at Reconcile — records why lifecycle-coupling was rejected |

## Constraints & Gotchas

- **Only the host side of a port mapping is variable.** Never parameterize the container-internal
  port — `web`→`backend` and healthchecks address services by internal port, not host port.
- **`VITE_API_BASE_URL` is baked at build time**, so changing `BACKEND_PORT` for a stack requires a
  matching `VITE_API_BASE_URL` *and* a rebuild (`./deploy.sh up` always builds first, so this is
  automatic on the next up). A stale value silently points the browser at the wrong backend.
- **`CORS_ALLOWED_ORIGINS` must include the stack's own `WEB_PORT` origin**, or the browser's calls
  are blocked by CORS.
- **The two checkout folders must have different basenames** — that is what gives distinct Compose
  project names (hence isolated containers/volumes/networks). Same-named folders would collide
  regardless of ports; documented.
- **`deploy.sh` must remain unmodified** — Compose reads `.env` for interpolation, so the script
  stays agnostic to the new variables. Do not add port logic to the script.
- Defaults must exactly equal today's fixed values so a single-stack user changes nothing.

## Amendment (2026-08-01) — prod/dev default semantics + PostgreSQL as the deployment default

Applied before Accept, by direct user instruction (this story's no-architect override still holds).
Two changes revise the original plan's "defaults reproduce today's single-stack values" framing:

1. **Explicit prod/dev split across two env templates.** The stacks are now named **"prod"** (the
   stable/live checkout) and **"dev"** (the active working checkout). Rather than one `.env.example`
   with a commented "SECOND CONCURRENT STACK" block, there are **two committed templates**:
   - `.env.example` — the **prod** stack: `STACK_NAME=prod`, canonical ports `8000`/`3000`/`5432`,
     PostgreSQL. `deploy.sh` bootstraps this on first run; it is the single-stack default.
   - `.env.dev.example` — the **dev** stack: `STACK_NAME=dev`, offset ports `8100`/`3100`/`5433`,
     SQLite, with `VITE_API_BASE_URL`/`CORS_ALLOWED_ORIGINS` pre-matched to the offset ports.
   A dev checkout runs `cp .env.dev.example .env`. This replaces the copy-paste commented block with
   two ready-to-use files and removes hand-editing.

2. **PostgreSQL is the deployment default; SQLite is opt-in.** The uncommented `.env.example`
   `DATABASE_URL` is the Postgres URL; the `deploy.sh` fallback and every `docker-compose.yml`
   `${VAR:-default}` fallback were flipped to match, so even a `.env`-less `docker compose --profile
   postgres up` renders Postgres/`prod`/canonical-ports. SQLite stays fully supported (commented in
   `.env.example`, the default in `.env.dev.example`, and still the backend code's built-in fallback
   for the no-`DATABASE_URL`-anywhere case — that code is unchanged, out of devops scope).

**Consequence for the STORY-024 ACs and the earlier Implementation Reports:** the AC clause "defaults
match the current fixed values so existing single-stack usage is unaffected" is intentionally
superseded for the two knobs the user chose to change — `STACK_NAME` (`local` → `prod`) and the DB
default (SQLite → PostgreSQL). Host **ports** are unchanged (prod keeps 8000/3000/5432). No
`deploy.sh` invocation change; no business-logic/API change.

The two Planned ADRs still stand; a third decision to confirm at Reconcile: **PostgreSQL as the
deployment default with a two-file prod/dev env-template split.**

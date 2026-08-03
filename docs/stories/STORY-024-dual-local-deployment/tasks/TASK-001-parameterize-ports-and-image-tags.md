---
status: Done
assignee: devops
story: STORY-024
---

# TASK-001: Parameterize host ports and image tags in Compose + .env.example

## What to implement
Replace the hardcoded host-side port bindings and image tags in the Compose stack with
Compose-interpolated variables whose defaults equal the current fixed values, so that:
- a single-stack user is completely unaffected (defaults reproduce today's behavior), and
- a second concurrent stack can override only its own environment file to avoid every cross-stack
  collision point (host ports + shared image tags).

Introduce four variables — a host port each for backend (REST+MCP), web, and the opt-in Postgres
service, plus a stack-name discriminator that namespaces the two built image tags. Keep the
container-internal ports fixed. Document all four in the committed environment template alongside
the already-env-driven browser-coupling values (the backend origin baked into the web build and the
backend's allowed CORS origins), and provide a ready-to-copy "second concurrent stack" block so the
five interdependent values move together.

## Scope
- `docker-compose.yml` (host port mappings + image tags + header comment)
- `.env.example` (new variables, coupling guidance, second-stack template block)
- No change to `deploy.sh` (Compose auto-loads `.env` for interpolation).

## Dependencies
None

## Acceptance Criteria
- [ ] Backend and web host ports are Compose variables with defaults `8000` / `3000`; container
      ports stay fixed.
- [ ] The opt-in Postgres host port is a Compose variable with default `5432`.
- [ ] Both image tags are namespaced by a stack-name variable defaulting to `local`.
- [ ] `.env.example` documents every new variable and the browser-coupling relationship, with a
      copy-paste second-stack block.
- [ ] `docker compose config` renders correctly for (a) the default env and (b) a second-stack env,
      showing distinct, non-overlapping host ports and distinct image tags — verified.
- [ ] `deploy.sh` is unchanged.

## Intended ADR
Env-configurable host ports + per-stack image tags for concurrent local stacks (confirm at Reconcile).

---
## Implementation Report
**Date**: 2026-08-01

**What was done**:
- `docker-compose.yml`: parameterized the host side of all three port mappings and both image tags.
  - backend: `image: aiacu-backend:${STACK_NAME:-local}`, port `"127.0.0.1:${BACKEND_PORT:-8000}:8000"`
  - web: `image: aiacu-web:${STACK_NAME:-local}`, port `"127.0.0.1:${WEB_PORT:-3000}:3000"`
  - db (postgres profile): port `"127.0.0.1:${POSTGRES_PORT:-5432}:5432"`
  - Container-internal ports left fixed (8000/3000/5432). Added a header comment documenting the
    concurrent-stacks intent and the host-only-side rule.
- `.env.example`: new top section with `STACK_NAME`/`BACKEND_PORT`/`WEB_PORT`/`POSTGRES_PORT`
  (defaults `local`/`8000`/`3000`/`5432`); tightened the `CORS_ALLOWED_ORIGINS` and
  `VITE_API_BASE_URL` comments to state they must track `WEB_PORT`/`BACKEND_PORT`; appended a
  copy-paste "SECOND CONCURRENT STACK" block (STACK_NAME=dev, 8100/3100/5433, matching VITE + CORS).
- `deploy.sh`: unchanged (confirmed — Compose auto-loads `.env` for interpolation).

**Verification** (`docker compose --profile postgres config`, rendered only — no build/run, no port
binding):
- Default env → `aiacu-backend:local` / `aiacu-web:local`, host-published 8000 / 3000 / 5432.
- Second-stack env (STACK_NAME=dev, ports +100/+1) → `aiacu-backend:dev` / `aiacu-web:dev`,
  host-published 8100 / 3100 / 5433.
- Both renders keep container `target` ports at 8000 / 3000 / 5432. Host ports are distinct and
  non-overlapping across the two; image tags are distinct. Confirms AC (ports configurable, defaults
  unchanged, no cross-stack overlap) without any daemon-level side effect.

**Deviations from plan**: None on ports. One addition beyond the literal port ACs, planned in
`implementation_plan.md`: `STACK_NAME` namespaces the image tags. The `web` image bakes
`VITE_API_BASE_URL` at build time, so the previously-shared `aiacu-web:local` tag was a genuine
cross-stack overwrite hazard; namespacing it is required for two stacks to work correctly, not
cosmetic. Default `local` keeps single-stack image names byte-identical.

**Technical decisions made**:
- Parameterize the **host side only** of each mapping; never the container port — inter-container
  networking and healthchecks address services by internal port.
- Keep `VITE_API_BASE_URL`/`CORS_ALLOWED_ORIGINS` as explicit vars (already env-driven) rather than
  deriving them from the port vars via nested Compose interpolation (which Compose does not resolve
  reliably) — documented coupling + a copy-paste block is the robust path.
- No change to `deploy.sh`: keeping the script agnostic to the new vars preserves AC "single-stack
  invocation unmodified" and avoids duplicating Compose's own `.env` interpolation.

**Code locations**: `docker-compose.yml`, `.env.example`.

**Technical debt noted**: The five interdependent second-stack values (STACK_NAME + 3 ports + 2
browser-coupling URLs) must be kept in sync by hand. Acceptable for a two-stack local workflow and
mitigated by the copy-paste template; a future helper could derive the coupling URLs from the ports
if more than two stacks ever become routine.

---

### Amendment (2026-08-01) — prod/dev split into two env files + PostgreSQL default

By direct user instruction, before Accept (see `implementation_plan.md` § Amendment). Two config
changes; ports themselves unchanged (prod keeps 8000/3000/5432).

**What changed:**
- **`.env.example`** is now the **prod** stack only: `STACK_NAME=prod`, `DATABASE_URL` uncommented as
  the **PostgreSQL** URL (SQLite moved to a commented opt-in line), CORS/VITE on 3000/8000. The
  commented "SECOND CONCURRENT STACK" block was removed (it now lives in its own file).
- **`.env.dev.example`** (new file) is the **dev** stack: `STACK_NAME=dev`, ports 8100/3100/5433,
  `DATABASE_URL=sqlite:///data/app.db` (with the Postgres URL as a commented alt),
  `VITE_API_BASE_URL=http://localhost:8100`, `CORS_ALLOWED_ORIGINS=http://localhost:3100` — a
  complete, copy-ready `cp .env.dev.example .env` file, no hand-editing.
- **`docker-compose.yml`** — flipped every `${VAR:-default}` fallback to the prod values so a
  `.env`-less render still yields the new default: `STACK_NAME:-prod` (both image tags),
  `DATABASE_URL:-postgresql+psycopg://app:app@db:5432/app`; ports/CORS/VITE fallbacks already matched
  prod (8000/3000/5432, 3000, 8000). Updated the header, `db`-service, `depends_on`, and volume
  comments (SQLite is no longer "default"; PostgreSQL is). No change to any container-internal port.
- **`deploy.sh`** — flipped the `DATABASE_URL` fallback to the Postgres URL, the DB-selection header
  comment, the first-run bootstrap message, and the profile-selection echo strings. Still no port
  logic in the script; still bootstraps `.env` from `.env.example` (prod).

**Verification** (`docker compose config`, rendered only — no build/run):
- Prod (`--env-file .env.example --profile postgres`) → `aiacu-backend:prod`/`aiacu-web:prod`, host
  ports 8000/3000/5432, `db` present, backend `DATABASE_URL` Postgres.
- Dev (`--env-file .env.dev.example`) → `aiacu-backend:dev`/`aiacu-web:dev`, host ports 8100/3100,
  **no** `db` service (SQLite), backend `DATABASE_URL` SQLite.
- Fallback-only (`--env-file /dev/null --profile postgres`) → `:prod` tags, 8000/3000/5432, Postgres
  URL, CORS/VITE on 3000/8000 — confirming no stale SQLite-default fallback remains in Compose.
- Container-internal target ports stay 8000/3000/5432 in every render.

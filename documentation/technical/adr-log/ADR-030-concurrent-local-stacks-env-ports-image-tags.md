# ADR-030: Concurrent local stacks via env-configurable ports + per-stack image tags

**Date**: 2026-08-03
**Status**: Accepted
**Decision**: Enable two independent Docker Compose stacks (a stable "prod"/live checkout and the active "dev" checkout) to run on one machine at once by making every cross-stack collision point a Compose-interpolated variable with a default equal to a canonical value:
- Host ports — `BACKEND_PORT` (8000), `WEB_PORT` (3000), `POSTGRES_PORT` (5432). Only the **host** side of each mapping is parameterized; container-internal ports stay fixed (8000/3000/5432), so inter-container networking, `depends_on`, and healthchecks are untouched.
- Image tags — `STACK_NAME` namespaces both built images (`aiacu-backend:${STACK_NAME}`, `aiacu-web:${STACK_NAME}`).
- Browser coupling — the already-env-driven `VITE_API_BASE_URL` (baked into the web build) and `CORS_ALLOWED_ORIGINS` must track a stack's own ports; they move together with the ports via the committed env templates.

Container/volume/network isolation is left to Compose's folder-based **project naming** (the compose file's containing-folder basename), which Compose already namespaces — so two differently-named checkout folders get isolated containers/volumes/networks for free. A separate **PostgreSQL container per stack** (its own `pg_data` volume, published on a distinct `POSTGRES_PORT`) is run rather than a shared server with distinct database names. `deploy.sh` is unchanged — Compose auto-loads the per-folder `.env` for interpolation.

**Options Considered**:
- Hardcoded ports/tags (status quo) — only one stack can run; the second collides on host ports and, more subtly, overwrites the shared `aiacu-web:local` image (which bakes `VITE_API_BASE_URL` at build time) under one tag.
- Env-configurable host ports + per-stack image tags, folder-based isolation (chosen).
- A single shared PostgreSQL server across both stacks, isolated by distinct database names — rejected.
- Deriving the coupling URLs from the port vars via nested Compose interpolation — rejected (Compose does not resolve nested interpolation reliably).

**Rationale**: Making only the *host* side of each mapping variable, with defaults equal to the canonical values, lets a single-stack user change nothing while a second stack overrides only its own env file. Namespacing image tags closes a real (if narrow) foot-gun: the web image bakes the backend URL at build time, so two stacks sharing `aiacu-web:local` would silently point one stack's UI at the other's backend after a rebuild. A separate Postgres container per stack keeps each stack self-contained (matching the SQLite mode's isolation), avoids coupling the two stacks' lifecycles (stopping "prod" would otherwise kill "dev"'s database), and needs only a distinct `POSTGRES_PORT`; the internal `DATABASE_URL` still targets each project's own `db` service on its own network. Keeping `deploy.sh` agnostic to the new variables preserves the "single-stack invocation unmodified" requirement and avoids duplicating Compose's own `.env` interpolation.

**Trade-offs**: The five interdependent second-stack values (`STACK_NAME` + three ports + two browser-coupling URLs) must be kept in sync by hand; this is mitigated by the committed `.env.dev.example` template (see ADR-031) and acceptable for a two-stack local workflow. Two checkout folders must have **different basenames** or their Compose project names collide regardless of ports. Two forgotten-override stacks fail fast with a clear Docker port-binding error rather than silently interfering. Running a Postgres container per stack uses more local resources than a shared server, accepted for lifecycle independence on a single dev machine.

# ADR-031: PostgreSQL as the deployment default + two-file prod/dev env templates

**Date**: 2026-08-03
**Status**: Accepted
**Decision**: Make **PostgreSQL** the default database for a *deployed* stack and split the environment template into two committed files aligned with the concurrent-stack workflow (ADR-030):
- `.env.example` — the **prod** stack: `STACK_NAME=prod`, canonical ports `8000`/`3000`/`5432`, `DATABASE_URL` uncommented as the PostgreSQL URL (SQLite moved to a commented opt-in line), CORS/VITE on 3000/8000. `deploy.sh` bootstraps this on first run; it is the single-stack default. A `.env`-less `docker compose --profile postgres` render also yields Postgres/prod/canonical-ports because every `docker-compose.yml` `${VAR:-default}` fallback (`STACK_NAME:-prod`, `DATABASE_URL:-postgresql+psycopg://...`) was flipped to the prod values.
- `.env.dev.example` (new) — the **dev** stack: `STACK_NAME=dev`, offset ports `8100`/`3100`/`5433`, `DATABASE_URL=sqlite:///data/app.db`, with `VITE_API_BASE_URL`/`CORS_ALLOWED_ORIGINS` pre-matched to the offset ports. A dev checkout runs `cp .env.dev.example .env` — a complete, copy-ready file, no hand-editing.

This changes the *deployment* default only. The DB-agnostic code contract (ADR-002) is unchanged: the backend still runs identically on either dialect, and the backend code's built-in fallback for the no-`DATABASE_URL`-anywhere case is still SQLite. SQLite remains fully supported (commented in `.env.example`, the default in `.env.dev.example`).

**Options Considered**:
- Keep SQLite as the deployment default with PostgreSQL opt-in (the ADR-002 status quo).
- One `.env.example` with a commented "SECOND CONCURRENT STACK" block (the pre-amendment TASK-001 shape).
- PostgreSQL default + two committed prod/dev env files (chosen), by direct user instruction before Accept.

**Rationale**: The user's intended concurrent workflow is a stable **prod** stack (PostgreSQL, mirroring how a released instance would run) beside an active **dev** stack (SQLite, zero-config for fast iteration). Two ready-to-use files (`cp .env.example .env` for prod, `cp .env.dev.example .env` for dev) remove the error-prone hand-editing of a commented template and make the five interdependent per-stack values (ADR-030) move together correctly by construction. Flipping the Compose fallbacks to the prod values keeps a `.env`-less render self-consistent with the new default instead of silently falling back to the old SQLite-default.

**Trade-offs**: The AC clause "defaults match the current fixed values so existing single-stack usage is unaffected" is intentionally superseded for the two knobs the user chose to change — `STACK_NAME` (`local` → `prod`) and the deployment DB default (SQLite → PostgreSQL); host ports are unchanged (prod keeps 8000/3000/5432). A prod stack now always starts a PostgreSQL container (heavier than the former SQLite default). The distinction between "deployment default" (Postgres) and "backend code fallback" (SQLite) must be kept clear in docs to avoid confusion — hence the explicit note here and in the architecture/CLAUDE Gotchas. This ADR does not supersede ADR-002; it refines which dialect a *deployed* stack selects by default while preserving full DB-agnosticism.

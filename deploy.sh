#!/usr/bin/env bash
# deploy.sh — single entry point for the local Docker Compose stack.
#
# Usage:
#   ./deploy.sh up        # build images, run migrations, start the whole stack
#   ./deploy.sh down      # stop the stack (named volumes are PRESERVED)
#   ./deploy.sh rebuild   # rebuild images from scratch (no cache), then up
#   ./deploy.sh migrate   # run `alembic upgrade head` only (stack need not be up)
#   ./deploy.sh logs      # follow stack logs
#
# Database selection is automatic, driven by DATABASE_URL in .env:
#   - PostgreSQL (default) -> the `postgres` Compose profile is activated and the
#                             backend waits for the db healthcheck before migrating.
#   - SQLite (opt-in)      -> no `db` container.
#
# This is a thin, readable wrapper over `docker compose`. There is no remote
# deploy, no orchestration tool, no CD trigger — "deploy" means "bring the local
# stack up". The user runs this; it is never run autonomously by an agent.
#
# Requires: Docker with the Compose v2 plugin (`docker compose`).
set -euo pipefail

# Resolve the project root (this script's directory) so the command works from
# any CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] ERROR: docker is not installed or not on PATH." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] ERROR: the Docker Compose v2 plugin ('docker compose') is required." >&2
  exit 1
fi

# Bootstrap .env from .env.example (the prod stack, PostgreSQL default) on first
# run so a clean machine works. For a concurrent DEV stack, copy .env.dev.example
# to .env in that checkout instead (see docs/devops-strategy.md § Running Two
# Stacks Concurrently) before running this script.
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ENV_EXAMPLE" ]]; then
    echo "[deploy] No .env found — creating one from .env.example (prod stack, PostgreSQL default)."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
  else
    echo "[deploy] ERROR: neither .env nor .env.example exists." >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# Determine the active database dialect from DATABASE_URL.
# Read the value WITHOUT sourcing .env (avoids executing arbitrary lines).
# ---------------------------------------------------------------------------
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://app:app@db:5432/app}"

COMPOSE=(docker compose)
if [[ "$DATABASE_URL" == postgres* ]]; then
  echo "[deploy] DATABASE_URL targets PostgreSQL (default) — activating the 'postgres' profile."
  COMPOSE+=(--profile postgres)
  USING_POSTGRES=1
else
  echo "[deploy] DATABASE_URL targets SQLite (opt-in) — no db container."
  USING_POSTGRES=0
fi

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------
cmd="${1:-up}"

case "$cmd" in
  up)
    echo "[deploy] Building images..."
    "${COMPOSE[@]}" build

    if [[ "$USING_POSTGRES" == "1" ]]; then
      echo "[deploy] Starting database and waiting for it to become healthy..."
      "${COMPOSE[@]}" up -d db
    fi

    # The backend container's entrypoint runs `alembic upgrade head` before it
    # serves, so bringing the stack up applies migrations (and the seed) on a
    # clean machine. Running them explicitly here too makes the step obvious in
    # the log and lets `up` fail fast on a migration error.
    echo "[deploy] Applying migrations..."
    # --entrypoint alembic bypasses docker-entrypoint.sh (which would itself run
    # `alembic upgrade head` and then exec the command), so migrations run once.
    "${COMPOSE[@]}" run --rm --entrypoint alembic backend upgrade head

    echo "[deploy] Starting the full stack..."
    "${COMPOSE[@]}" up -d

    echo "[deploy] Done. Services (localhost only):"
    echo "          REST + MCP : http://localhost:8000  (MCP at /mcp, docs at /v1/docs)"
    echo "          Web UI      : http://localhost:3000"
    ;;

  down)
    echo "[deploy] Stopping the stack (volumes preserved)..."
    "${COMPOSE[@]}" down
    echo "[deploy] Stopped. Data volumes are intact. Use 'docker compose down -v' to wipe data."
    ;;

  rebuild)
    echo "[deploy] Rebuilding images from scratch (no cache)..."
    "${COMPOSE[@]}" build --no-cache
    echo "[deploy] Applying migrations..."
    if [[ "$USING_POSTGRES" == "1" ]]; then
      "${COMPOSE[@]}" up -d db
    fi
    # --entrypoint alembic bypasses docker-entrypoint.sh (which would itself run
    # `alembic upgrade head` and then exec the command), so migrations run once.
    "${COMPOSE[@]}" run --rm --entrypoint alembic backend upgrade head
    echo "[deploy] Starting the full stack..."
    "${COMPOSE[@]}" up -d
    echo "[deploy] Rebuild complete."
    ;;

  migrate)
    echo "[deploy] Running migrations only (alembic upgrade head)..."
    if [[ "$USING_POSTGRES" == "1" ]]; then
      "${COMPOSE[@]}" up -d db
    fi
    # --entrypoint alembic bypasses docker-entrypoint.sh (which would itself run
    # `alembic upgrade head` and then exec the command), so migrations run once.
    "${COMPOSE[@]}" run --rm --entrypoint alembic backend upgrade head
    echo "[deploy] Migrations complete."
    ;;

  logs)
    "${COMPOSE[@]}" logs -f
    ;;

  *)
    echo "Usage: ./deploy.sh {up|down|rebuild|migrate|logs}" >&2
    exit 2
    ;;
esac

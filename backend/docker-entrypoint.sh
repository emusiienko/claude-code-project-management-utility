#!/usr/bin/env sh
# Backend container entrypoint.
#
# Runs Alembic migrations (idempotent — `upgrade head` is a no-op when already
# current) and then execs the given command (uvicorn by default). This makes a
# bare `docker compose up` correct on a clean machine: the schema and the
# seeded system_settings exist before the app serves a single request.
#
# The same Alembic scripts run on both SQLite (default) and PostgreSQL — the URL
# comes from DATABASE_URL via app.core.config, which alembic/env.py reads.
set -eu

echo "[entrypoint] Applying database migrations (alembic upgrade head)..."
alembic upgrade head

echo "[entrypoint] Migrations complete. Starting: $*"
exec "$@"

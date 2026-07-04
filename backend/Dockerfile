# Backend image — single FastAPI/Uvicorn process serving BOTH the REST API
# and the MCP server (path-mounted at /mcp) on one port (:8000). See ADR-003/007.
#
# Dependencies are installed with uv (the project package manager, per
# docs/backend-coding-conventions.md) against the committed uv.lock, so builds
# are reproducible and match the local dev toolchain.
#
# Owned by devops (build); app contents owned by backend-developer.

FROM python:3.12-slim AS base

# Vendored uv binary from the official image — no pip/curl installer step.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# - PYTHONDONTWRITEBYTECODE / PYTHONUNBUFFERED: no .pyc on the volume; logs stream to stdout
# - UV_COMPILE_BYTECODE: precompile for faster cold start
# - UV_LINK_MODE=copy: correct behaviour when installing from the cache mount
# - UV_PYTHON_DOWNLOADS=0: use the base image's system Python, don't fetch another
# - UV_PROJECT_ENVIRONMENT: pin the venv location we put on PATH below
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0 \
    UV_PROJECT_ENVIRONMENT=/app/backend/.venv \
    PATH="/app/backend/.venv/bin:$PATH"

WORKDIR /app/backend

# curl is used by the compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Dependency layer — copy only the lockfile + project metadata first so Docker
# caches the (slow) dependency install across source-only changes. --frozen fails
# the build if uv.lock is stale relative to pyproject.toml (reproducibility);
# --no-install-project installs only third-party deps here; --no-dev keeps
# black/isort/pytest out of the runtime image.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Application source. Copied after deps so editing code does not bust the
# dependency cache layer above.
COPY . .

# Install the local `app` / `migrations` project into the venv so imports resolve.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Non-root runtime user. The data directories are created and chowned so the
# SQLite file (./data) and the attachments volume (/data/attachments) are
# writable regardless of which volume Compose mounts on top.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/backend/data /data/attachments \
    && chown -R appuser:appuser /app /data
USER appuser

EXPOSE 8000

# REST + MCP share this one process/port. The entrypoint script runs Alembic
# migrations first (idempotent) and then execs uvicorn, so a fresh container
# always has an up-to-date schema before it serves. alembic and uvicorn resolve
# to the uv-managed venv via PATH. deploy.sh also runs migrations explicitly;
# running them here too keeps a bare `docker compose up` correct without
# depending on the wrapper.
COPY --chown=appuser:appuser docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER root
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER appuser
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

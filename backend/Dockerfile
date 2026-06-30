# Backend image — single FastAPI/Uvicorn process serving BOTH the REST API
# and the MCP server (path-mounted at /mcp) on one port (:8000). See ADR-003/007.
#
# Owned by devops (build); app contents owned by backend-developer.

FROM python:3.12-slim AS base

# - PYTHONDONTWRITEBYTECODE: no .pyc files in the image/volume
# - PYTHONUNBUFFERED: logs stream straight to the container stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app/backend

# Install build/runtime essentials. curl is used by the compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Dependency layer — copy only the project metadata first so Docker can cache
# the (slow) dependency install across source-only changes.
COPY pyproject.toml ./
RUN pip install --upgrade pip \
    && pip install .

# Application source. Copied after deps so editing code does not bust the
# dependency cache layer above.
COPY . .

# Re-install so the local `app` / `migrations` packages are importable on the
# path (editable-style resolution); deps are already cached from the layer above.
RUN pip install --no-deps -e .

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
# always has an up-to-date schema before it serves. deploy.sh also runs
# migrations explicitly; running them here too keeps a bare `docker compose up`
# correct without depending on the wrapper.
COPY --chown=appuser:appuser docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER root
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER appuser
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

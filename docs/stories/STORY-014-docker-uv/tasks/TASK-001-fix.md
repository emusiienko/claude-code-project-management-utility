---
status: Done
assignee: devops
story: STORY-014
---

# TASK-001: Switch backend Docker image to uv

## What to implement
Replace the pip-based dependency install in the backend image with a uv-based,
locked install driven by `uv.lock`, and run runtime commands inside the
uv-managed virtual environment. Behaviour of the running container is unchanged.

## Scope
- `backend/Dockerfile`
- `backend/docker-entrypoint.sh` (only if `alembic` invocation needs to move into the venv)

## Dependencies
None

## Acceptance Criteria
- [x] Dependencies installed via `uv sync --frozen` against the committed `uv.lock`.
- [x] `uv.lock` + `pyproject.toml` copied into the dependency layer for cache friendliness.
- [x] `alembic` and `uvicorn` run inside the uv-managed environment.
- [x] Non-root runtime user, port :8000, migration-on-start behaviour preserved.
- [x] No change to runtime dependency set, ports, volumes, or DB switch.

## Intended ADR
None — this aligns the image with an already-decided project convention (uv);
no new decision is introduced.

---
## Implementation Report
**Date**: 2026-07-02
**What was done**:
- Rewrote `backend/Dockerfile` to install dependencies with uv instead of pip:
  - Vendored the uv binary from the official `ghcr.io/astral-sh/uv:latest`
    image via `COPY --from`, so no `pip install uv` step and no network fetch of
    an installer script.
  - Set `UV_COMPILE_BYTECODE=1` (faster cold start), `UV_LINK_MODE=copy` (correct
    behaviour with the cache mount), `UV_PYTHON_DOWNLOADS=0` (use the base image's
    system Python, don't let uv download a second interpreter), and
    `UV_PROJECT_ENVIRONMENT=/app/backend/.venv`.
  - Dependency layer: `COPY pyproject.toml uv.lock ./` then
    `uv sync --frozen --no-install-project --no-dev` behind a
    `--mount=type=cache,target=/root/.cache/uv` cache mount. `--frozen` fails the
    build if `uv.lock` is stale relative to `pyproject.toml` (reproducibility
    guarantee); `--no-dev` keeps black/isort/pytest out of the runtime image;
    `--no-install-project` installs only third-party deps in this layer so source
    edits don't bust the (slow) dependency cache.
  - After `COPY . .`, a second `uv sync --frozen --no-dev` installs the local
    project (`app` / `migrations`) into the venv.
  - Put the venv on `PATH` (`ENV PATH="/app/backend/.venv/bin:$PATH"`) so
    `alembic` and `uvicorn` resolve to the venv binaries with no `uv run` wrapper
    needed at runtime — keeps the entrypoint and CMD unchanged.
- Left `backend/docker-entrypoint.sh` untouched: `alembic upgrade head` now
  resolves to `/app/backend/.venv/bin/alembic` via `PATH`, so no edit was needed.
- Preserved everything else: non-root `appuser` (uid 10001), data/attachments dir
  creation + chown, `EXPOSE 8000`, entrypoint runs migrations then execs the CMD
  (`uvicorn main:app --host 0.0.0.0 --port 8000`).

**Deviations from plan**:
- Kept a single-stage build rather than the uv docs' two-stage
  builder/runtime split. Reason: the app runs from the copied working directory
  with `app`/`migrations` on `PYTHONPATH` (matching the existing local-dev and
  test setup, `PYTHONPATH=.`), and this is a localhost-only single-machine image
  where a marginally smaller image is not worth the added Dockerfile complexity.
  The reproducibility win (locked `uv.lock` install) is fully delivered either way.
- `docker-entrypoint.sh` was in TASK scope only conditionally; no change was
  required, so it was left as-is.

**Technical decisions made**:
- `--frozen` over `--locked`: both honour the lockfile; `--frozen` additionally
  refuses to even read/update the lock and errors if it's stale — the strongest
  reproducibility signal for a CI-less, image-based build.
- `--no-dev` in the image: dev tooling (black, isort, pytest, httpx) belongs to
  local dev / QA, not the runtime container.
- Vendored uv binary via `COPY --from=ghcr.io/astral-sh/uv:latest` per uv's
  official Docker guide — avoids an extra pip layer and a curl-piped installer.

**Code locations**:
- `backend/Dockerfile`

**Technical debt noted**:
- `pyproject.toml` still declares `build-system = setuptools`. This is compatible
  with uv (uv reads `[project]` and `[dependency-groups]` regardless of the build
  backend) and out of scope for this fix; no action needed unless the project
  later wants `uv_build`. Ownership of `pyproject.toml` is backend-developer's.
- `ghcr.io/astral-sh/uv:latest` is unpinned. Acceptable for a local-only image;
  pin to a specific uv version if build reproducibility of the *installer* (not
  just the deps) ever matters.

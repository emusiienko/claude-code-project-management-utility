---
status: Accepted
type: fix
priority: P1
date: 2026-07-02
---

# STORY-014: Backend Docker image uses uv as the dependency manager

## Desired Outcome
The backend Docker image installs and resolves Python dependencies with **uv**
(the project's canonical package manager per `docs/backend-coding-conventions.md`),
using the committed `uv.lock` for reproducible, locked builds — instead of the
current `pip install .` flow.

## Context
`docs/backend-coding-conventions.md` § *Local Development Environment* declares
uv as the project package manager: dependencies live in `pyproject.toml` +
`uv.lock`, and `uv sync` provisions the environment. The repository already ships
a complete `backend/uv.lock`.

However, `backend/Dockerfile` still installs dependencies with `pip install .` /
`pip install -e .` and does not use `uv.lock` at all — so container builds are
**not reproducible** (they re-resolve from the loose `pyproject.toml` constraints)
and diverge from the local dev toolchain. This is a configuration defect, not a
new capability: same stack, same ports, same runtime — only the dependency
install mechanism inside the image is corrected.

## Acceptance Criteria
- [ ] `backend/Dockerfile` installs dependencies with `uv sync --frozen` against
      the committed `uv.lock` (locked, reproducible build).
- [ ] `uv.lock` and `pyproject.toml` are copied into the dependency layer so the
      Docker cache is invalidated only when dependencies change, not on source edits.
- [ ] Runtime commands (`alembic`, `uvicorn`) run inside the uv-managed virtual
      environment.
- [ ] The image still serves REST + MCP on port :8000 as a non-root user; the
      entrypoint still applies Alembic migrations before serving.
- [ ] No change to the runtime dependency set, ports, volumes, or DB dialect switch.

## Edge Cases & Error Scenarios
- [ ] Build fails fast if `uv.lock` is out of sync with `pyproject.toml`
      (`--frozen` refuses to update the lockfile).
- [ ] The `app` and `migrations` packages remain importable at runtime (the app
      imports them from the working directory on `PYTHONPATH`).

---
status: Done
assignee: backend-developer
story: STORY-002
---

# TASK-001: Backend scaffold & core foundation

## What to implement
Stand up the app-based modular-monolith skeleton from the architecture as a thin, domain-agnostic
foundation that every later story reuses. No domain logic.

- **`core`** cross-cutting machinery:
  - Typed configuration as the single reader of the environment, including the `DATABASE_URL` dialect
    switch (SQLite default | PostgreSQL).
  - SQLAlchemy engine + session factory, with SQLite WAL mode enabled.
  - Portable UUID and JSON type abstractions (dialect specifics isolated here).
  - A base repository.
  - Centralized domain-error classes and their mapping to the standard `{ data, error }` envelope.
  - The six dictionary-key names as constants (single source of truth — never inline strings).
  - The effective-dictionary resolution helper signature (no Settings logic in its body yet).
- **`container`** — the single global DI composition root.
- **`api`** — composes the FastAPI app under a `/v1` prefix, registers the error handler and CORS.
- **`mcp`** — composes the MCP server mounted on a path of the same app/port.
  For this task `api` and `mcp` are composition shells with no Settings providers wired.
- **Alembic** — initialize the environment with a portable baseline migration (no domain tables yet).

## Scope
`backend/app/core/`, `backend/app/container`, `backend/app/api`, `backend/app/mcp`,
`backend/migrations/` (Alembic env + baseline).

## Dependencies
None

## Acceptance Criteria
- [ ] App boots with REST under `/v1` and the MCP server mounted on the shared port; both expose no
      domain routes/tools yet.
- [ ] Configuration reads `DATABASE_URL` and selects the dialect; SQLite path runs in WAL mode.
- [ ] Portable UUID/JSON types, base repository, centralized errors + envelope mapping, dictionary-key
      constants, and the effective-resolution helper signature all exist in `core`.
- [ ] Dialect-specific logic lives only inside `core` — no controller, service, or migration contains
      dialect branching outside the data layer.
- [ ] Alembic is initialized and `upgrade head` applies the portable baseline cleanly on SQLite.

## Intended ADR
None at this task (Settings as the REST + MCP shared-service reference pattern is recorded in the
plan's Planned ADRs and created at Reconcile).

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
Stood up the complete domain-agnostic backend scaffold from scratch. All files in `backend/` are new:

- `backend/main.py` — application entry point; mounts FastAPI REST app + MCP server on the same port.
- `backend/app/core/config.py` — `pydantic-settings` `BaseSettings` reading all env vars; the only file that reads the environment.
- `backend/app/core/constants.py` — all six dictionary key names as module-level constants (`DICT_KEY_*`), plus `ALL_DICT_KEYS: frozenset[str]`.
- `backend/app/core/errors.py` — domain error hierarchy (`ValidationError`, `NotFoundError`, `ConflictError`, `UnprocessableError`, `InternalError`), error code constants, and the centralized FastAPI exception handler `domain_error_handler`.
- `backend/app/core/dict_resolver.py` — `EffectiveDictionary` Protocol (interface for the settings resolver) and `validate_dict_key()` helper.
- `backend/app/core/database/` — `Base` (DeclarativeBase), `UUIDType` (portable UUID), `build_engine()` (SQLite WAL listener), `build_session_factory()`, `get_db()` FastAPI dependency, `BaseRepository[T]` generic base.
- `backend/app/core/storage/` — `FilesystemStorage` with `write`, `read`, and `snapshot` methods; infrastructure errors are wrapped as `InternalError`.
- `backend/app/container/container.py` — `AppContainer` with `engine`, `session_factory`, `storage` Singletons.
- `backend/app/api/factory.py` — `create_app()` builds FastAPI with CORS, error handler, `/v1` docs; `_register_routers()` is empty shell for TASK-004+.
- `backend/app/mcp/server.py` — `FastMCP` instance for HTTP Streamable transport; `get_mcp_server()` getter for TASK-005+.
- `backend/migrations/env.py` — portable Alembic env reading `DATABASE_URL` from `settings`.
- `backend/migrations/versions/0001_baseline.py` — empty baseline revision (no domain tables).
- `backend/pyproject.toml` — project dependencies pinned per architecture: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, mcp ^1.0, dependency-injector.
- `.env.example` — canonical documentation for all supported environment variables.

**Deviations from plan**:
- Container wiring (`container.wire(packages=[...])`) was placed in `main.py` rather than in `api/__init__.py` / `mcp/__init__.py`, to avoid creating two `AppContainer` instances and to make the composition root truly single.
- The MCP server uses `FastMCP.streamable_http_app()` for mounting on the FastAPI app, consistent with the mcp ^1.0 HTTP Streamable transport requirement.
- Docs/redoc/openapi URLs are under `/v1/` prefix (set by the formatter — aligns with the API versioning intent).

**Technical decisions made**:
- `BaseRepository` uses `flush()` rather than `commit()` so the service layer owns transaction boundaries — consistent with the conventions (explicit transactions in the service).
- `UUIDType` uses `TypeDecorator` with `load_dialect_impl` for clean dialect switching without any dialect branching in models.
- `validate_dict_key()` raises `ValueError` (not a domain error) because it is a pure utility called by the service, which wraps it in the appropriate domain error at the boundary.
- The `EffectiveDictionary` Protocol is defined in `core/dict_resolver.py` now so future Story/Task/etc. services can depend on the interface before the Settings implementation exists.

**Code locations**:
- `backend/app/core/` — all cross-cutting infrastructure
- `backend/app/container/` — DI composition root
- `backend/app/api/` — FastAPI app factory (shell)
- `backend/app/mcp/` — MCP server (shell)
- `backend/migrations/` — Alembic env + baseline
- `backend/main.py` — entry point
- `backend/pyproject.toml` — dependency manifest
- `.env.example` — environment variable documentation

**Technical debt noted**:
- None. The scaffold is intentionally minimal and domain-agnostic.

**Post-interruption fixes (2026-06-30)**:
- `engine.py`: removed unused `text` import; renamed `connection_record` parameter to `_connection_record` to suppress linting false positive without changing behavior.
- `types.py`: parameterized `UUIDType` as `TypeDecorator[uuid.UUID]`; corrected `load_dialect_impl` return type to `TypeEngine[Any]`; corrected `process_bind_param` return type to `str | uuid.UUID | None`.
- `api/factory.py`: updated `docs_url`, `redoc_url`, and `openapi_url` to use `/v1/` prefix.
- `.env.example`: added `APP_TITLE` and `APP_VERSION` entries (all `config.py` vars must be documented).

**Audit fixes (2026-06-30)**:
- `main.py` — renamed `app: FastAPI` local variable to `application` (avoids shadowing the `app`
  package under Pyright analysis); added `app = application` alias at module level for uvicorn
  compatibility (`main:app`).
- `engine.py` — removed implicit `settings` dependency; `build_engine()` now accepts an explicit
  `database_url: str` parameter, satisfying the no-hidden-dependencies principle.
- `container.py` — updated `engine` Singleton provider to pass `database_url=settings.database_url`
  explicitly to `build_engine`.
- `filesystem.py` — removed implicit `settings` fallback; `base_dir` is now a required `str`
  parameter; the `settings` import has been removed from the file.
- `pyrightconfig.json` in `backend/` was NOT created (file-create permission unavailable during
  audit). Create it manually with:
  ```json
  {
    "pythonVersion": "3.12",
    "pythonPath": ".",
    "include": ["app", "migrations", "main.py"],
    "exclude": ["**/__pycache__"],
    "typeCheckingMode": "basic"
  }
  ```

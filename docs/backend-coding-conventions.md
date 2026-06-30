# Backend Coding Conventions

> Owned by **backend-developer**. Update only at the user's explicit request.
> Stack: Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 · MCP SDK
> Last updated: 2026-06-30 (rev 4)

---

## Git

- Branch naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- Commit format: Conventional Commits — `type(scope): short description`
  - Types: feat, fix, chore, refactor, docs, test
- No direct commits to main/develop — PRs only
- No `--no-verify`, no force-push to main

---

## Comments

- Do not explain WHAT the code does — well-named identifiers do that
- Only add a comment when the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant
- No commented-out code in commits
- No TODO without a linked story ID (e.g. `# TODO(STORY-005): handle rate limit retry`)

---

## Code Organisation

- One concept per file — do not bundle unrelated responsibilities
- No circular dependencies between modules
- Layer order (strict, no skipping): `controller (router) → service → data layer (ORM models)`
- MCP tools follow the same order: `mcp tool → service → data layer`
- `core/` depends on nothing app-specific; app packages may depend only on `core/` and each other's
  data layer (for aggregation/composition reads), never on another app's service

---

## File & Module Naming

- All files: `snake_case` (`user_service.py`, `auth_middleware.py`, `project_repository.py`)
- Folders/packages: `snake_case` (`task_links/`, `attachment_types/`)
- Per-app structure (each domain package contains):
  - `controller.py` — FastAPI router (controller); thin: parse input → call service → return response
  - `service.py` — business logic; the single source of truth for all domain rules
  - `model.py` — SQLAlchemy ORM models (private to the backend; never serialized directly to responses)
  - `schema.py` — Pydantic request/response schemas
  - `repository.py` — domain-specific repository that extends `core/database/repository.py`
  - `mcp_tools.py` — MCP tool definitions (thin wrappers over the service)
- `core/` structure:
  - `config.py` — typed settings via `pydantic-settings`; the only file that reads `os.environ`
  - `database/` — package: SQLAlchemy engine + session factory + `get_db` dependency in `__init__.py`;
    `repository.py` contains the base repository class all domain repositories extend
  - `storage/` — package: filesystem read/write/snapshot for attachment files; `__init__.py` exposes
    the public API; implementation details remain internal to the package
  - `errors.py` — domain error classes and the centralized error handler
  - `dict_resolver.py` — effective-dictionary resolution helper
- `container/` top-level package — the **single, global DI composition root**:
  - imports from all app packages and `core/`
  - defines all `dependency_injector` providers (`Factory`, `Singleton`)
  - exposes one or more container classes that `api/` and `mcp/` import at startup
  - no other package defines or owns providers; app packages have no `dependencies.py`
- `api/` top-level package — imports controllers from all apps and composes the FastAPI application;
  owns API versioning (e.g. `/v1` prefix); wires the `container/` container at startup;
  `main.py` imports from `api/`, not directly from app packages
- `mcp/` top-level package — imports `mcp_tools.py` from all apps and composes the MCP server;
  wires the `container/` container at startup; the MCP entrypoint imports from `mcp/`, not directly
  from app packages

---

## Style

- Follow PEP 8 strictly
- Indentation: 4 spaces (never tabs)
- Max line length: 88 characters (Black formatter default)
- Use **Black** for formatting, **isort** for import sorting
- Trailing commas on multi-line literals and function signatures — yes (Black-compatible)

---

## Type Hints

- All function signatures must have type hints (PEP 484)
- Use `X | None` (Python 3.10+ union syntax) for nullable parameters — not `Optional[X]`
- Use `Protocol` to define interfaces for injectable dependencies (preferred over `ABC`)
- Avoid `Any` — use `Union`, `TypeVar`, or `object` and narrow with `isinstance`
- Return type annotations are mandatory on all functions, including `-> None`

---

## Pydantic v2

- Request bodies are `BaseModel` subclasses; they live in `schema.py`
- Response schemas are separate from ORM models — never return a raw ORM object
- Use `model_config = ConfigDict(from_attributes=True)` when mapping from ORM objects
- Field aliases for API-facing names (snake_case internal, camelCase to frontend is acceptable if
  agreed in the API contract — currently contract uses snake_case, keep it)
- Validators use `@field_validator` (Pydantic v2 API); no v1 `@validator` usage
- Settings class uses `pydantic-settings` `BaseSettings`; all env vars declared there

---

## SQLAlchemy 2.0

- Use the **2.0-style** API exclusively: `select()`, `session.execute()`, `session.scalars()` —
  never the legacy 1.x `session.query()` API
- ORM models live in `model.py`; they are private to the backend — never exposed in API responses
- ORM models and Pydantic schemas are separate concerns; never share or inherit between them
- Use `DeclarativeBase` (2.0 style); annotated columns via `Mapped[X]` and `mapped_column()`
- All writes happen inside an explicit transaction; use `async with session.begin()` or manage
  `commit`/`rollback` explicitly — never rely on implicit autocommit
- Sessions are provided via the `dependency_injector` container (or FastAPI `Depends(get_db)` from
  `core/database/`) — never instantiate a session directly inside a service or tool
- UUID primary keys: use `uuid.UUID` in Python; `Uuid` SQLAlchemy type on PostgreSQL, `String(36)`
  on SQLite — abstracted via a custom `UUIDType` in `core/database/`
- JSON columns (`labels`): use `JSON` type; dialect-aware filtering (SQLite `json_each` /
  `json_extract`, PostgreSQL `jsonb` operators) stays inside the data layer

---

## Alembic

- Migration scripts must be dialect-portable; branch only where unavoidable (`op.execute()` with
  a dialect check)
- Every schema change has exactly one migration — no schema edits without a matching migration
- Data migrations (e.g. seed `system_settings`) are separate Alembic revisions from schema changes
- Never modify generated migration files to add business logic — that belongs in the service layer

---

## FastAPI (HTTP Layer)

- Route handlers are thin: parse → validate (Pydantic does this automatically) → call service →
  return response; no business logic inside a router
- HTTP status codes match semantics and must be expressed with FastAPI constants (never raw integers):
  `status.HTTP_200_OK`, `status.HTTP_201_CREATED`, `status.HTTP_204_NO_CONTENT`,
  `status.HTTP_404_NOT_FOUND`, `status.HTTP_409_CONFLICT`, `status.HTTP_422_UNPROCESSABLE_ENTITY`
- Never return `200` with an error body — use the correct status code
- All error responses use the standard envelope (defined in `core/errors.py`):
  ```json
  { "error": "Human-readable message.", "code": "ERROR_CODE", "details": [{"field": "...", "message": "..."}] }
  ```
  `details` is omitted when not applicable
- All list endpoints support pagination: `limit` (max 100, default 50) + `offset`; response
  includes `total` count
- Request/response envelope for single resources: `{ "data": { ... } }`
- Request/response envelope for lists: `{ "data": [...], "total": N, "limit": N, "offset": N }`
- File endpoints (`GET /attachments/:id/file`) stream with `StreamingResponse`; never load the
  full file into memory
- Rate-limit header enforcement is infrastructure-level (nginx/Compose); the backend does not
  implement rate limiting itself
- CORS is configured once in the app factory via `CORSMiddleware` using `CORS_ALLOWED_ORIGINS`
- Attachment uploads: max 10 MB enforced at the router level before calling the service

---

## MCP Tools Layer

- Each app that needs MCP access exposes its tools in `mcp_tools.py`
- MCP tools are thin wrappers: parse MCP input → call the app service → return MCP result
- MCP tools must produce behavior identical to their REST counterparts — the service is the single
  logic path
- Domain errors raised by the service are caught in the tool and re-raised as MCP `ToolError` with
  the same `code` and `message` — never expose raw Python exceptions to agents

---

## Error Handling

- Never swallow exceptions silently
- Infrastructure errors (DB, filesystem) are caught at the repository/storage boundary and
  re-raised as domain errors defined in `core/errors.py`
- User-facing messages never expose internals (stack traces, SQL, file paths)
- Log levels: `DEBUG` for expected flow, `WARNING` for recoverable issues, `ERROR` for unexpected
  failures
- The centralized exception handler in `core/errors.py` maps all domain error classes to their
  HTTP status codes and standard error envelope — register it once in the app factory

---

## Dependency Injection

- **`dependency_injector`** is the global DI mechanism. All providers are defined in the dedicated
  top-level `container/` package — the single composition root for the entire application
- `container/` imports from all app packages and `core/`; no app package owns its own providers
  or contains a `dependencies.py` file
- Never instantiate services or repositories inside a function — declare them as container providers
  and inject via `@inject` + `Provide[Container.service]`, or wrap with FastAPI `Depends()`
- Services accept the DB session as a provider injected via the container; the container itself
  receives the session factory from `core/database/`
- Define `Protocol` interfaces for all injectable dependencies; concrete implementations are
  registered in containers as `Factory` or `Singleton` providers as appropriate:
  - Request-scoped objects (services, repositories): `Factory` provider
  - Application-scoped objects (session factory, config, storage): `Singleton` provider
- Wiring happens once in `api/__init__.py` (for the HTTP app) and `mcp/__init__.py` (for the MCP
  server); they import the container from `container/` and call `container.wire()`; app packages
  themselves never call `container.wire()`

---

## Environment Configuration

- Never hardcode secrets, ports, or environment-specific values — use `core/config.py`
- `core/config.py` is the only place that reads environment variables (`os.environ` / `pydantic-settings`)
- Validate and parse all env vars at startup via `pydantic-settings`; fail fast with a clear error
  message if a required variable is missing or invalid
- Do not call `os.environ` anywhere outside `core/config.py`
- **`.env.example`** is maintained at the project root and is the canonical documentation of all
  supported environment variables:
  - Every variable declared in `core/config.py` must have a corresponding entry in `.env.example`
  - Use placeholder values or safe defaults — never real secrets (`.env.example` is committed to git)
  - Group variables by concern with a comment header (e.g. `# Database`, `# Storage`, `# Auth`)
  - When adding or removing a variable in `core/config.py`, update `.env.example` in the same commit

---

## Local Development Environment

- The project ships a virtual environment at `backend/.venv`
- Always activate it (or invoke it directly) when running Python commands locally:
  `backend/.venv/bin/python`, `backend/.venv/bin/pytest`, `backend/.venv/bin/alembic`, etc.
- Never install packages into the system Python or any Conda/Anaconda environment
- All `pip install` commands must target `backend/.venv` — use `backend/.venv/bin/pip install`

### Running Tests

Tests are integration tests that hit a real in-process SQLite database. `PYTHONPATH=.` makes the
`app` package importable without an editable install. Always run from the `backend/` directory.

**Full suite:**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/ -v
```

**Single test file (story-scoped):**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/test_projects.py -v
```

**Single test by name:**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/ -v -k test_create_project_duplicate_name_conflicts
```

**With coverage:**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/ -v --cov=app --cov-report=term-missing
```

Required environment variables:

| Variable | Test value | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | `sqlite:///./tests/test.db` | Isolated SQLite file; never the dev database |
| `ATTACHMENTS_DIR` | `./tests/attachments_tmp` | Injected by the test fixture automatically |

`ATTACHMENTS_DIR` is set by the `conftest.py` fixture — no manual export needed. `DATABASE_URL`
must always be set explicitly on the command line as shown above; do not rely on `.env` for tests.

---

## DB Portability (SQLite ⇄ PostgreSQL)

- All dialect-specific logic (UUID type, JSON filtering, case-insensitive uniqueness, WAL mode)
  is isolated in `core/database/` or behind abstractions in `model.py`
- Services and routers never contain dialect-specific SQL or conditions
- SQLite runs in WAL mode — enable via `PRAGMA journal_mode=WAL` on connection in `core/database/`
- Case-insensitive uniqueness for project/milestone names: implemented via a functional unique index
  (`LOWER(name)`) — dialect-aware DDL in the migration, transparent to the service layer

---

## DRY — Single Source of Truth

- Every piece of logic, constant, key list, or configuration value has exactly one authoritative
  source; all callers import from there
- Dictionary key names (e.g. `"task_statuses"`, `"link_types"`) are defined as constants in
  `core/dict_resolver.py` or a dedicated `core/constants.py` — never written as inline strings
  in services or schemas
- Error codes (e.g. `"NOT_FOUND"`, `"CONFLICT"`) are defined as string constants or an `Enum` in
  `core/errors.py`; never duplicated across modules

---

## Engineering Principles

- **Separation of I/O from logic**: a function that computes a result must not also call the DB,
  filesystem, or an external service. Pure logic in services; I/O in the data layer / storage helper
- **No hidden dependencies**: if a function needs the current time or a random value, receive it
  as a parameter — never call `datetime.now()` or `uuid.uuid4()` directly inside business logic
  that needs to be tested deterministically
- **Explicit inputs, explicit outputs**: avoid functions that depend on global state or mutate
  external state as a side effect
- **SOLID**: single responsibility, open/closed, Liskov substitution, interface segregation,
  dependency inversion — see Backend Developer role instructions for full detail

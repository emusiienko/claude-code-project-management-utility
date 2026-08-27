# Backend Coding Conventions

> Owned by **lead-developer** (backend stack). Update only at the user's explicit request.
> Stack: Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 · fastmcp
> Last updated: 2026-08-27 (rev 10 — new § Testing: the implementer owns this stack's unit and
> integration tests, unit tests are test-first via `Skill("superpowers:test-driven-development")`,
> plus test kinds/locations and per-test rules. User-directed, no Task)
>
> rev 9 (2026-08-27) — adopted into fast-sdlc: relocated from
> `docs/backend-coding-conventions.md`; corrected `core/config.py`→`app/config.py`
> and "app factory"→`app/main.py` to match the as-built code

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
- A comment at the top of a function is allowed only when the name **and** the implementation
  together are still not enough to understand its purpose; if added, it must be brief and cover
  only the non-obvious parts — not a full description of what the function does
- No class-level summary comments when the class name is self-explanatory
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
- `core/` contains only domain-agnostic utilities shared across multiple domains (e.g. DB engine,
  error classes, storage). Constants, enums, Protocols, and helpers that belong to a specific domain
  live in that domain's package — never in `core/`
- The FastAPI `application` object is created in `app/main.py`. No factory function or factory
  module exists. `app/main.py` is the single place for: FastAPI instantiation, middleware,
  exception handler registration, router inclusion, and MCP server mounting
- **Layer interfaces**: Pydantic schemas (`schema.py`) define the contract between the HTTP/MCP
  layer and the service layer. Controllers and MCP tools pass Pydantic request objects directly to
  the service; the service accepts them as typed input and may return Pydantic response objects
  defined in `schema.py`. Pydantic objects do not cross into the repository layer — repositories
  receive plain Python values and return ORM model instances
- Before writing any method in a subclass, read the parent class in full — never re-implement
  what the base already provides
- Before writing any new class in a domain package (repository, storage, service), check `core/`
  first — if a base class exists that covers the common contract, extend it rather than starting
  from scratch

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
- Top-level `app/` files (not inside a subdomain):
  - `config.py` — typed settings via `pydantic-settings`; the only file that reads `os.environ`
  - `main.py` — FastAPI application entry point (see Code Organisation for what lives here)
  - `exc_handlers.py` — FastAPI-specific exception handlers and the `_build_error_body` helper;
    no business logic, only HTTP translation
- `core/` structure:
  - `database/` — package: SQLAlchemy engine + session factory + `get_db` dependency in `__init__.py`;
    `repository.py` contains the base repository class all domain repositories extend
  - `storage/` — package: filesystem read/write/snapshot for attachment files; `__init__.py` exposes
    the public API; implementation details remain internal to the package
  - `errors.py` — `ErrorCode` enum + `DomainError` class hierarchy; no FastAPI imports except
    `fastapi.status` for HTTP status code constants on error subclasses
- `container/` top-level package — the **single, global DI composition root**:
  - imports from all app packages and `core/`
  - defines all `dependency_injector` providers (`Factory`, `Singleton`)
  - exposes one or more container classes that `api/` and `mcp/` import at startup
  - no other package defines or owns providers; app packages have no `dependencies.py`
- `api/` top-level package — routing composition only: `routes.py` defines `ApiVersion`/`AppPath`
  enums; `router.py` assembles domain routers into version routers and exposes `app_router`;
  `app/main.py` imports `app_router` and attaches it to the application
- `mcp/` top-level package — owns all `FastMCP` server instances; `app/main.py` mounts each
  instance at its versioned path; domain `mcp_tools.py` files import from here to register tools

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

### Schema naming

- **Output schemas** (returned from the API) are named after the domain object with no suffix:
  `Project`, `Story`, `Task`. Never add `Response` or `Schema` as a suffix.
- **Input schemas** for write operations use a verb prefix with no `Body` suffix:
  `CreateProject`, `UpdateProject`, `CreateStory`. Never add `Body` or `Request` as a suffix.

### Validation placement

- **Field-level validation** (non-empty, max length, format) belongs in Pydantic `@field_validator`
  decorators on the input schema. The service never sees data that violates these rules.
- **Business-rule validation** (uniqueness, cross-field invariants, external state) belongs in the
  service layer. The service calls the repository to assert constraints that Pydantic cannot know.

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
- CORS is configured once in `app/main.py` via `CORSMiddleware` using `CORS_ALLOWED_ORIGINS`
- Attachment uploads: max 10 MB enforced at the router level before calling the service

---

## Routing

### `app/api/` package structure

| File | Purpose |
|---|---|
| `__init__.py` | Empty — package marker only |
| `routes.py` | `ApiVersion` and `AppPath` enums; single source of truth for all URL path segments |
| `router.py` | Composition only: assembles domain routers into version routers, then into `app_router` |

### Enum notes (`routes.py`)

`ApiVersion` and `AppPath` are `str, Enum` subclasses with `__str__` overridden to return
`self.value` — required on Python 3.12 for correct f-string interpolation.

### `router.py` — composition pattern

```python
v1_router = APIRouter(prefix=f"/{ApiVersion.V1}")
v1_router.include_router(domain_router, prefix=f"/{AppPath.DOMAIN}")

app_router = APIRouter()
app_router.include_router(v1_router)
```

Domain routers carry no domain-level prefix internally — the prefix is added here at composition.
`app_router` is the single object imported by `main.py`.

### Adding a new API version

1. Add a value to `ApiVersion` in `routes.py`
2. Assemble a new `vN_router` in `router.py` with `prefix=f"/{ApiVersion.VN}"`
3. Include it into `app_router`

### Adding a new domain

1. Add a value to `AppPath` in `routes.py`
2. Import the domain router in `router.py`
3. Include it in the appropriate version router with `prefix=f"/{AppPath.NEW_DOMAIN}"`
4. The domain `controller.py` defines routes without a domain-level prefix

---

## MCP Tools Layer

### Module structure and dependencies

- `app/mcp/server.py` owns all `FastMCP` server instances (`mcp_server_v1`, `mcp_server_v2`, …)
  and nothing else — it has no imports from domain packages
- Each domain package exposes its tools in `mcp_tools.py`; that file imports the server instance
  it targets and registers tools via `@mcp_server_vN.tool()` at module level
- `main.py` mounts each server instance at its versioned path (`/mcp/v1`, `/mcp/v2`, …) and
  wires the container; `container.wire()` imports all domain modules, which triggers tool
  registration as a side effect — no explicit `register_*()` calls anywhere
- Dependency direction is strictly one-way: domain `mcp_tools.py` → `mcp/server.py`; the reverse
  never holds

### Versioning

- A new MCP version is a new `FastMCP` instance in `mcp/server.py` mounted at a new path
- Tools shared between versions are decorated with both `@mcp_server_v1.tool()` and
  `@mcp_server_v2.tool()` on the same function — stacking works because each decorator is a
  pure registration side-effect that returns the original function unchanged
- Tools exclusive to a version carry only that version's decorator
- Deprecated tools are removed from the newer server instance, not from the function

### Package

The project uses the **`fastmcp`** package (`pip: fastmcp`, not `mcp.server.fastmcp` from the
Anthropic SDK). `fastmcp` provides `fastmcp.dependencies.Depends()` and `fastmcp.exceptions.ToolError`
which are not available in the SDK's bundled FastMCP.

### Session management

- MCP tools run in a FastMCP (`uncalled_for`) context — not a FastAPI request context
- `@inject + Closing[Provide[...]]` applied directly on an MCP tool raises `InvalidSignature`:
  FastMCP's schema introspection treats `Provide`/`Closing` markers as non-serializable types
  and exposes them as tool arguments visible to agents
- The solution is a **bridge function** in `container/mcp_dependencies.py`: a per-domain
  `provide_X_service()` async context manager that combines `@asynccontextmanager + @inject`
  and owns the `Closing[Provide[...]]` parameter internally; `fastmcp.dependencies.Depends()`
  receives the bridge so the injected parameter is hidden from the tool schema
- Full pattern and rules: **Dependency Injection → MCP injection**

### Behavior and error handling

- MCP tools are thin wrappers: parse input → call the service → return result; no business logic
- MCP tools must produce behavior identical to their REST counterparts — the service is the single
  logic path
- Domain errors are caught and re-raised as `fastmcp.exceptions.ToolError` with
  `f"[{exc.code}] {exc.message}"` — raw Python exceptions are never exposed to agents
- The MCP server is mounted with `http_app(transport="streamable-http")` in `main.py`

---

## Error Handling

- Never swallow exceptions silently
- Infrastructure errors (DB, filesystem) are caught at the repository/storage boundary and
  re-raised as domain errors defined in `core/errors.py`
- User-facing messages never expose internals (stack traces, SQL, file paths)
- Log levels: `DEBUG` for expected flow, `WARNING` for recoverable issues, `ERROR` for unexpected
  failures
- The centralized exception handler in `core/errors.py` maps all domain error classes to their
  HTTP status codes and standard error envelope — register it once in `app/main.py`

---

## Dependency Injection

- **`dependency_injector`** is the global DI mechanism. All providers are defined inside the
  `container/` package — the single composition root for the entire application. The package may
  be split into sub-containers (e.g. one per domain), but all must live under `container/`
- Domain packages never own providers and never contain a `dependencies.py` file
- Never instantiate services or repositories outside the container
- The `container/` package contains only two things: provider definitions (`container.py`) and
  bridge helpers that simplify DI usage in a specific transport layer (e.g. `mcp_dependencies.py`
  for MCP context managers). Business logic, domain queries, and cross-domain utilities must not
  live here — they belong in the relevant domain package

### Provider types

| Scope | Provider | Example |
|---|---|---|
| Application-scoped (created once) | `providers.Singleton` | engine, session factory, storage |
| Request/context-scoped with lifecycle | `providers.ContextLocalResource` | DB session |
| Application-scoped with lifecycle | `providers.Resource` | connection pool, external client |
| Stateless, created per resolution | `providers.Factory` | repositories, services |

- Any dependency with an **init / free lifecycle** (open/close, connect/disconnect, begin/commit)
  **must** use `providers.Resource` or `providers.ContextLocalResource` — never `Singleton` or
  `Factory` for resources that require teardown
- The DB session is always a `providers.ContextLocalResource` so all repositories resolved in
  the same request context share one session (context-local singleton)

### Naming

- Init functions for `Resource` / `ContextLocalResource` providers are named `init_{slug}`
  (e.g. `init_db_session`, `init_http_client`) — never `get_*` or `_get_*`

### FastAPI injection

- Use `@inject` + `Depends(Provide[Container.provider])` in every route handler
- Route handlers that use `Closing[Provide[...]]` **must be `async def`** — the teardown
  (commit/close) only runs when `DependencyResolver.__aexit__` is active; sync handlers in a
  thread pool use `DependencyResolver.__exit__` which does not trigger provider shutdown
- For resources with a lifecycle (e.g. DB session), add `Depends(Closing[Provide[Container.db_session]])`
  to the handler so the resource is properly torn down after the response:
  ```python
  @router.get("/endpoint")
  @inject
  async def endpoint(
      _db: Session = Depends(Closing[Provide[Container.db_session]]),
      service: MyService = Depends(Provide[Container.my_service]),
  ) -> dict:
      ...
  ```
- The `_db` parameter is unused in the handler body — it is declared solely to trigger the
  `ContextLocalResource` init and register its teardown with FastAPI
- Wiring happens once: `api/` and `mcp/` call `container.wire()` at startup; domain packages
  never call `container.wire()`

### MCP injection

MCP tools cannot carry `@inject + Closing[Provide[...]]` directly: FastMCP's schema
introspection treats the markers as tool arguments. The pattern that makes DI work in MCP
is a bridge function that stacks `@asynccontextmanager` and `@inject`:

- `@inject` (inner decorator) detects an async generator and wraps it with
  `_get_async_gen_patched`, keeping `DependencyResolver` alive for the full generator
  lifetime — the resolver opens the session, begins the transaction, and commits on exit
- `@asynccontextmanager` (outer decorator) converts the async generator into an
  `AbstractAsyncContextManager` that `fastmcp`'s `uncalled_for` engine can enter/exit
  via `AsyncExitStack`

All per-domain bridge functions live in `container/mcp_dependencies.py`:

```python
@asynccontextmanager
@inject
async def provide_settings_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: SettingsService = Provide[AppContainer.settings_service],
):
    # DependencyResolver.__aenter__ initializes ContextLocalResource (session opened,
    # transaction begun); __aexit__ calls shutdown() (commit + close).
    # @asynccontextmanager converts async gen → AbstractAsyncContextManager for uncalled_for.
    yield service
```

The bridge is consumed via `fastmcp.dependencies.Depends()` in tool signatures — the
`service` parameter is hidden from the tool's JSON schema and not visible to agents:

```python
@mcp_server_v1.tool()
async def get_system_settings(
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    ...
```

Constraints for `container/mcp_dependencies.py`:

- `Provide[AppContainer.X]` — always the class-level attribute, never the container instance
  (`container.X`); `providers_map` is keyed by class-level providers
- `Closing[Provide[AppContainer.db_session]]` — two-level nesting is required; using
  `Closing[provider_directly]` (without the inner `Provide`) causes
  `AttributeError: 'provider' has no attribute 'modifier'`
- `container.wire()` in `main.py` must include `"app.container"` so that `@inject` in
  `mcp_dependencies.py` receives provider bindings
- One typed bridge function per domain — not a generic factory; the explicit `service` type
  annotation preserves Pyright type checking in each `mcp_tools.py`

### Testing with the container

- In tests, override `container.session_factory` (not `container.db_session`) so that
  `db_session` remains the original `ContextLocalResource`. `DependencyResolver` calls
  `shutdown()` on the original provider — which IS initialized — so the commit runs:
  ```python
  with container.session_factory.override(providers.Object(test_session_factory)):
      ...
  ```
- Never override `db_session` directly: `DependencyResolver` captures the original provider at
  wiring time and calls `shutdown()` on it; if the original was never initialized (only the
  override was), shutdown is a no-op and the session generator is abandoned without commit

---

## Environment Configuration

- Never hardcode secrets, ports, or environment-specific values — use `app/config.py`
- `app/config.py` is the only place that reads environment variables (`os.environ` / `pydantic-settings`)
- Validate and parse all env vars at startup via `pydantic-settings`; fail fast with a clear error
  message if a required variable is missing or invalid
- Do not call `os.environ` anywhere outside `app/config.py`
- **`.env.example`** is maintained at the project root and is the canonical documentation of all
  supported environment variables:
  - Every variable declared in `app/config.py` must have a corresponding entry in `.env.example`
  - Use placeholder values or safe defaults — never real secrets (`.env.example` is committed to git)
  - Group variables by concern with a comment header (e.g. `# Database`, `# Storage`, `# Auth`)
  - When adding or removing a variable in `app/config.py`, update `.env.example` in the same commit

---

## Local Development Environment

- **uv** is the project's package manager and virtual environment tool.
- The virtual environment lives at `backend/.venv`; `uv sync` creates it on first run.
- All packages are installed exclusively into `backend/.venv` — never into the system Python.
- `uv add` is the canonical way to add dependencies; it updates both `pyproject.toml` and
  `uv.lock` atomically. Direct `pip install` is not used.

### Dependency commands

| Command | Purpose |
|---|---|
| `uv sync --dev` | First-time setup and re-sync after `git pull` |
| `uv lock` | Regenerate `uv.lock` after manually editing `pyproject.toml` |
| `uv add <pkg>` | Add a runtime dependency |
| `uv add --dev <pkg>` | Add a dev-only dependency |
| `uv run <cmd>` | Run a command inside the venv without activating it |

### Running Tests

Tests are integration tests that hit a real in-process SQLite database. `PYTHONPATH=.` makes the
`app` package importable without an editable install. Tests are run from the `backend/` directory.

**Full suite:**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/ -v
```

**Single test file (story-scoped):**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/test_projects.py -v
```

**Single test by name:**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/ -v -k test_create_project_duplicate_name_conflicts
```

**With coverage:**
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/ -v --cov=app --cov-report=term-missing
```

Required environment variables:

| Variable | Test value | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | `sqlite:///./tests/test.db` | Isolated SQLite file; never the dev database |
| `ATTACHMENTS_DIR` | `./tests/attachments_tmp` | Injected by the test fixture automatically |

`ATTACHMENTS_DIR` is set by the `conftest.py` fixture — no manual export needed. `DATABASE_URL`
is set explicitly on the command line; `.env` is not used for tests.

---

## Testing

### Ownership

- The implementer writes this stack's **unit and integration tests** as part of the same Task, Quick
  Fix, or Bug Fix that changes the code. Test-writing is not deferred to another role.
- `qa-automation` tests the **running system black-box from the outside** (across surfaces and repos);
  it does not add or edit files under `backend/tests/`.
- The existing `backend/tests/` suite was authored under the prior process by `qa-automation`. It is
  now maintained by whoever changes the code it covers — extend and correct it in place.
- A Task is not `Done` until the tests for its change exist and pass. A pre-existing failure unrelated
  to the change goes in the Implementation Report; a test that passed in the baseline and fails after
  is a regression and must be fixed before `Done`.

### Two kinds, two locations

| Kind | Covers | Location | Reaches |
|---|---|---|---|
| Unit | One service method, helper, schema validator, or `core/` function in isolation | `backend/tests/unit/test_<module>.py` (a package, with `__init__.py`, mirroring `tests/`) | No HTTP, no migrations; take the `db_session` fixture only when the unit under test genuinely needs the data layer |
| Integration | A full path through a real surface — `controller → service → data layer`, or an MCP tool through the same service | `backend/tests/test_<domain>.py` — the existing flat layout, one file per domain | The `client` httpx fixture against the real migrated in-process SQLite database |

- A new domain gets a new `tests/test_<domain>.py`; never bundle two domains' integration tests in one
  file.
- Both surfaces of a shared service must be covered: when a change touches an endpoint, the
  integration test asserts the REST route **and** the MCP tool behave identically.

### Mode: TDD for unit tests

- Unit tests are written **test-first**. Before writing the first unit test of a Task, invoke
  `Skill("superpowers:test-driven-development")` and follow it. That skill is the authority on the
  red-green-refactor mechanics — do not improvise them, and do not restate them here.
- Integration tests are not required to be test-first: write them once the unit-level behavior is
  green, before marking the Task `Done`.

### Rules for every test, either kind

- One behavior per test. The test name states the behavior and its expected outcome — e.g.
  `test_create_project_duplicate_name_conflicts`.
- Assert on observable output only: response status and body, the returned schema, or the raised
  `DomainError` subclass and its `ErrorCode`. Never assert on internal call order or private state.
- **Do not mock the database.** The suite runs against a real, migrated SQLite database — use
  `conftest.py`'s fixtures (`client`, `db_session`, `session_factory`, `create_project`) rather than
  building private setup or substituting a fake data layer.
- Override `container.session_factory`, never `container.db_session` — see
  § Dependency Injection > Testing with the container.
- Tests are deterministic: never assert against a value derived from `datetime.now()` or
  `uuid.uuid4()` computed inside the code under test — pass it in (see § Engineering Principles).
- A test module never imports from another test module; shared setup belongs in `conftest.py`.
- `asyncio_mode = "auto"` is set in `pyproject.toml` — async tests need no `@pytest.mark.asyncio`.
- Test-only dependencies are added with `uv add --dev`, never as runtime dependencies.

Commands: see § Local Development Environment > Running Tests.

---

## DB Portability (SQLite ⇄ PostgreSQL)

- All dialect-specific logic (UUID type, JSON filtering, case-insensitive uniqueness, WAL mode)
  is isolated in `core/database/` or behind abstractions in `model.py`
- Services and routers never contain dialect-specific SQL or conditions
- SQLite runs in WAL mode — enable via `PRAGMA journal_mode=WAL` on connection in `core/database/`
- Case-insensitive uniqueness for project/milestone names: implemented via a functional unique index
  (`LOWER(name)`) — dialect-aware DDL in the migration, transparent to the service layer
- **SQL dialect differences**: All logic that differs between SQLite and PostgreSQL (JSON operators,
  CAST syntax, etc.) must be extracted into reusable helper functions in `backend/app/core/database/`.
  Domain repositories call these helpers — they do not contain inline dialect branches.

---

## DRY — Single Source of Truth

- Every piece of logic, constant, key list, or configuration value has exactly one authoritative
  source; all callers import from there
- Domain-specific constants, enums, and key lists are defined in the owning domain package
  (e.g. `settings/schema.py`) — never written as inline strings and never placed in `core/`
  unless they are genuinely shared across multiple unrelated domains
- Error codes (e.g. `"NOT_FOUND"`, `"CONFLICT"`) are defined in the `ErrorCode` enum in
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

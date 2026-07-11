# QA Automation Strategy

> Owned by **qa-automation**. Update only at the user's explicit request.
> Stack: Python 3.12 · pytest · httpx (async) · pytest-asyncio · Vitest · React Testing Library
> Last updated: 2026-07-06 (rev 6)

---

## Scope

Automated tests cover the **REST API layer** of the backend. The strategy for this project is:

| Layer | Automated | Notes |
|-------|-----------|-------|
| REST API (integration) | Yes | Primary coverage — validate contract shapes, status codes, business rules |
| Service / unit | No | Logic is thin and exercised entirely through the API layer |
| Frontend unit | Yes | Hooks, utility functions, and component logic — not visual rendering |
| Frontend E2E | No | Personal single-developer tool; manual QA covers visual/UI aspects |
| MCP tools | No | MCP tools are thin wrappers over the same service layer as REST; REST coverage is sufficient |

Rationale: all business logic lives in the service layer and is accessible via REST. The API contract is locked at v1.0. Testing the HTTP surface gives full backend coverage with no coupling to internal implementation details. Frontend unit tests cover non-trivial logic in hooks and utilities that is not exercised by the API layer.

---

## Backend Testing

### Python Environment

The backend uses a virtual environment located at `backend/.venv`.

**Always activate it (or use its binaries directly) before running tests or installing packages:**

```bash
# Activate
source backend/.venv/bin/activate

# Or use directly without activating
backend/.venv/bin/python -m pytest ...
backend/.venv/bin/pip install ...
```

**Install / sync all dependencies (first-time setup or after `pyproject.toml` changes):**

```bash
# From project root:
backend/.venv/bin/pip install -e "backend/[dev]"
# or from inside backend/:
.venv/bin/pip install -e ".[dev]"
```

> **Note**: the editable install (`-e`) may fail with `BackendUnavailable: Cannot import 'setuptools.backends.legacy'` depending on the pip version. In that case, install deps directly (without `-e`):
> ```bash
> # Parse deps from pyproject.toml and install
> cd backend && .venv/bin/pip install fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy alembic mcp dependency-injector "psycopg[binary]" pytest pytest-asyncio httpx black isort
> ```
> The `app` package is made importable at test time via `PYTHONPATH=.` (see Run Commands below).

Never install packages into the system Python or Anaconda base environment for this project.

---

### Framework

| Tool | Version | Purpose |
|------|---------|---------|
| `pytest` | ^8.0 | Test runner |
| `pytest-asyncio` | ^0.23 | Async test support |
| `httpx` | ^0.27 | Async HTTP client for hitting the live backend |
| `pytest-env` | ^1.1 | Inject environment variables per test run |

Tests are **integration tests** — they run against a real backend process with a real SQLite database (test-scoped, discarded after each run). No mocking of the service layer or database.

### Test Structure

```
backend/
  tests/
    conftest.py            # app fixture, client fixture, shared helpers
    test_projects.py       # STORY-003
    test_stories.py        # STORY-004
    test_tasks.py          # STORY-005
    test_task_links.py     # STORY-006
    test_attachments.py    # STORY-007
    test_comments.py       # STORY-008
    test_sessions.py       # STORY-009
    test_settings.py       # STORY-002
    test_milestones.py     # STORY-012
```

One test file per domain module. File names mirror the backend app package they test.

### Test Script Locations

```
backend/
  tests/
    conftest.py            # app fixture, client fixture, shared helpers
    test_projects.py       # STORY-003
    test_stories.py        # STORY-004
    test_tasks.py          # STORY-005
    test_task_links.py     # STORY-006
    test_attachments.py    # STORY-007
    test_comments.py       # STORY-008
    test_sessions.py       # STORY-009
    test_settings.py       # STORY-002
    test_milestones.py     # STORY-012
```

### Environment Configuration

| Variable | Test value | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | `sqlite:///./tests/test.db` | Isolated SQLite file, never the dev database |
| `ATTACHMENTS_DIR` | `./tests/attachments_tmp` | Temp directory, cleaned up by fixture |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Not relevant during API tests |

The run command injects `DATABASE_URL` directly. No `.env` file is required for tests.

### App Fixture Design

`backend/tests/conftest.py` will:

1. Create a fresh SQLite database at `./tests/test.db` (delete if exists).
2. Run Alembic migrations to `head` against it — this applies the seed data migration too.
3. Start the FastAPI app in-process using `httpx.AsyncClient(app=app, base_url="http://test")`.
4. Yield the client to each test.
5. Drop and remove `test.db` after the session.

The `ATTACHMENTS_DIR` fixture creates a temp directory and removes it at session teardown.

Each test is responsible for creating the data it needs. Tests must not depend on execution order. Shared helper functions (e.g. `create_project(client)`) live in `conftest.py`.

### Test Conventions

- **One assert per logical check** — separate status code assert from body shape assert.
- **Negative tests required** — for every happy path, at least one failure case (404 for unknown ID, 409 for conflict, 422 for invalid dictionary value, 400 for validation).
- **No hardcoded UUIDs** — always use the IDs returned by creation calls.
- **No test-order dependency** — each test creates and cleans up its own data, or relies on test-session fixtures.
- **Assertion messages** — include the field name in assertion failure messages for faster diagnosis.
- **File naming** — `test_<domain>.py`, test functions `test_<action>_<scenario>` (e.g. `test_create_project_duplicate_name_conflicts`).

### Coverage Zones per Story

| Story | Test file | Key zones |
|-------|-----------|-----------|
| STORY-002 (Settings) | `test_settings.py` | System dict GET; project override PUT; effective resolution; invalid key 404 |
| STORY-003 (Projects) | `test_projects.py` | CRUD happy path; name conflict 409; case-insensitive uniqueness; pagination |
| STORY-004 (Stories) | `test_stories.py` | CRUD; status dictionary validation 422; label filtering; aggregate endpoint |
| STORY-005 (Tasks) | `test_tasks.py` | CRUD; type/status dict validation; detail composition (links+attachments+comments); dependency endpoint |
| STORY-006 (Task Linking) | `test_task_links.py` | Create link; self-link 400; cross-project link 400; duplicate 409; delete |
| STORY-007 (Attachments) | `test_attachments.py` | Upload doc/image; external-ref create; archive; version history; file download; 10 MB limit |
| STORY-008 (Comments) | `test_comments.py` | CRUD on story/task/milestone; label filtering; author_role optional |
| STORY-009 (Sessions) | `test_sessions.py` | CRUD; linked_story/task validation; archive; incomplete-session query |
| STORY-010 (MCP) | skip | MCP tools are REST-equivalent; REST coverage is sufficient; MCP smoke only if requested |
| STORY-012 (Milestones) | `test_milestones.py` | CRUD; single-project ownership; name-per-project uniqueness (409); story assignment; story_count; activate/finish lifecycle; single-active invariant + cross-project isolation; delete-clears-assignment; milestone_id filter on story list |

### Run Commands

All commands use the `.venv` Python environment inside `backend/`. `PYTHONPATH=.` makes the `app` package importable without an editable install.

#### Full suite
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/ -v
```

#### Story-scoped run (example)
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/test_settings.py -v
```

#### With coverage
```bash
cd backend
DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. .venv/bin/pytest tests/ -v --cov=app --cov-report=term-missing
```

The test database file (`backend/tests/test.db`) is written by the fixture and must not be committed. It is deleted and recreated on every test session start.

### CI Integration

Tests are run in the same Docker environment as the application. The expected CI command:

```bash
docker compose run --rm backend pytest tests/ -v
```

Required env var: `DATABASE_URL=sqlite:///./tests/test.db` (injected by CI config or Compose service definition for the test run).

No separate CI infrastructure is required in V1 — tests run on the developer machine alongside the app.

### Bug Assignment Policy

When a backend test fails and the root cause is unclear, assign as follows:

| Failure domain | Assignee |
|----------------|----------|
| HTTP status code wrong, wrong response shape, missing field | `backend-developer` |
| Incorrect business rule / dictionary validation not enforced | `backend-developer` |
| Infrastructure (DB connection, migration failure, startup crash) | `devops` |
| Test script itself (wrong assertion, stale fixture) | `qa-automation` (self) |
| Ambiguous / spans multiple layers | `TBD` — escalate to user |

---

## Frontend Testing

### Infrastructure

The frontend test infrastructure is active and confirmed working (STORY-015):

- `frontend/vitest.config.ts` — Vitest config with `environment: "jsdom"`, `globals: true`, `setupFiles: "./vitest.setup.ts"`, and `@` path alias matching the Vite build config
- `frontend/vitest.setup.ts` — imports `@testing-library/jest-dom` to register custom matchers globally across all test files

### Framework

| Tool | Version | Purpose |
|------|---------|---------|
| `vitest` | ^1.x | Test runner — native Vite integration, ESM-first, fast watch mode |
| `@testing-library/react` | ^16.x | Component rendering and user interaction queries |
| `@testing-library/user-event` | ^14.x | Realistic user event simulation |
| `@testing-library/jest-dom` | ^6.x | Custom matchers (`toBeInTheDocument`, `toHaveValue`, etc.) |
| `jsdom` | via vitest environment | Browser DOM simulation |

Frontend tests run entirely in-process with Vitest — no browser, no network calls, no backend required.

### What to Test

**Test these:**
- Custom hooks — all state transitions, side effects, return values
- Utility / helper functions — pure transformations, formatters, validators
- Component logic — conditional rendering based on props/state, event handler callbacks, form validation logic

**Do NOT test:**
- Visual rendering, CSS classes, layout, or pixel-level appearance — manual QA covers this
- Snapshot tests — brittle, provide low signal; prohibited
- Third-party library internals (React, React Router, etc.)
- Simple pass-through components with no logic

### Test Structure

Co-locate test files alongside the source files they cover:

```
frontend/
  src/
    hooks/
      useProjects.ts
      useProjects.test.ts        # hook unit test
    utils/
      formatDate.ts
      formatDate.test.ts         # util unit test
    components/
      ProjectCard/
        ProjectCard.tsx
        ProjectCard.test.tsx     # component logic test
```

One test file per component/hook/utility module. Test file name mirrors the source file with a `.test.ts` / `.test.tsx` suffix.

### Test Conventions

- **One assertion per logical check** — mirror the backend convention.
- **No snapshot tests** — explicitly prohibited.
- **No implementation detail testing** — test behavior (what the user/caller observes), not internals (state variable names, private methods).
- **Mock only external boundaries** — mock `fetch` / API client calls; never mock React hooks or internal module logic.
- **Test function naming** — `describe('<HookOrComponent>', () => { it('<does something>', ...) })`.
- **Setup** — import `@testing-library/jest-dom` matchers in `vitest.setup.ts`; reference it via `setupFiles` in `vite.config.ts` / `vitest.config.ts`.

### Test Files

| File | Story | Coverage |
|------|-------|----------|
| `frontend/src/shared/components/IconButton.test.tsx` | STORY-015 | Shared primitive: accessible label, aria-label+title, click handler, disabled state |
| `frontend/src/features/projects/components/ProjectList.test.tsx` | STORY-015 | Row actions: edit/delete icon buttons by aria-label, correct callback routing, multi-row isolation, empty state, error state |
| `frontend/src/features/settings/components/DictionaryEditor.test.tsx` | STORY-015 | Edit mode toggle, Clear override button (enabled/disabled/in-flight), chip remove buttons, save/cancel flows |
| `frontend/src/shared/hooks/useLocalStorage.test.ts` | STORY-016 | Default value, read from storage, corrupted JSON fallback, setValue persistence, functional updater, intra-tab and cross-tab event sync |
| `frontend/src/app/RootRedirect.test.tsx` | STORY-016 | Redirect to /projects (no stored ID, no projects), redirect to /projects/:lastId/stories (stored ID), redirect to /projects/:firstId/stories (no stored ID but projects exist), null/corrupted stored value |
| `frontend/src/app/ProjectShell.test.tsx` | STORY-016 | Loading indicator, 4-tab sub-nav renders when project found, navigation landmark, 404 not-found message, back-to-projects link, generic load-error message |
| `frontend/src/app/TopBar.test.tsx` | STORY-016 | App switcher renders, task-manager/sessions mode from pathname, Settings button visible/hidden by mode, switching to Sessions, switching to Task Manager with/without stored last URL |
| `frontend/src/app/ProjectSidebar.test.tsx` | STORY-016 | Project list renders, Manage Projects link, active project aria-current, collapse/expand toggle, collapsed state persisted in localStorage, pre-collapsed from localStorage, empty-state text, Manage Projects still present when empty |
| `frontend/src/features/stories/components/StorySlideOver.test.tsx` | STORY-016 | Dialog renders, title/status badge, close button accessible label, breadcrumb button, Escape key navigates back, close/breadcrumb click navigates back, not-found on error/undefined, loading indicator, backdrop click |
| `frontend/src/features/board/hooks/useBoardDrag.test.ts` | STORY-016 | resolveTargetStatus utility (4 cases); useBoardDrag: initial state, dragStart/End state, valid cross-column drop, same-column no-op, invalid status triggers onInvalidDrop, null over target, card-to-card fallback |
| `frontend/src/features/board/BoardPage.test.tsx` | STORY-016 | Loading guard (settings/stories), error alert, empty-statuses message, one column per status, Board heading, story count summary, kanban region landmark |
| `frontend/src/features/settings/SettingsPage.test.tsx` | STORY-016 | Heading present, SystemSettings renders, no Project Overrides tab, no System Defaults tab (flat page), copy mentions project context |
| `frontend/src/features/settings/ProjectSettingsPage.test.tsx` | STORY-016 | Project Settings heading, EffectiveSettingsPanel renders, project ID passed from route, override descriptive copy |
| `frontend/src/features/board/hooks/useBoardMilestoneFilter.test.ts` | STORY-012 / STORY-017 | no milestones → null id + empty array; milestones with no active → null id; active milestone → defaults to its id; milestones array populated; isLoading forwarded; handleSelectMilestone changes id; accepts null (show all); projectId change resets to new default |

### Run Commands

```bash
# Full frontend unit suite (confirmed working — 27 tests, ~1.4s)
cd frontend
npx vitest run

# Watch mode (development)
cd frontend
npx vitest

# With coverage
cd frontend
npx vitest run --coverage
```

### Bug Assignment Policy

Frontend unit test failures are assigned as follows:

| Failure domain | Assignee |
|----------------|----------|
| Hook logic returns wrong value / wrong state transition | `frontend-developer` |
| Utility function produces wrong output | `frontend-developer` |
| Component renders wrong branch / fires wrong callback | `frontend-developer` |
| Test script itself (wrong query, stale mock) | `qa-automation` (self) |
| Ambiguous | `TBD` — escalate to user |

---

## Out of Scope

- End-to-end browser tests (Playwright / Selenium) — deferred; personal tool with manual QA covers visual/UI
- Visual rendering / appearance tests — manual QA responsibility; snapshot tests explicitly prohibited
- Load / performance tests — non-functional targets are validated manually during implementation
- MCP protocol tests — REST layer coverage is equivalent; MCP smoke can be added on request
- Contract mutation testing — API contract is locked; no consumer-driven contract testing needed

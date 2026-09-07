# coder (backend) — References

Setup completed under STORY-001 / TASK-004 (2026-08-27, SESSION-006). This instance is scoped to the
**backend** stack only (Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 · fastmcp); the
frontend React stack is a separate coder instance (`../frontend/`, TASK-010).

## Artifacts I read (not owned)

Coding Conventions, Implementation Plan, Technical Documentation (incl. the **LOCKED** API Contract),
and backend Repo-level ADRs — all resolved from `fast-sdlc-project-setup.md` § Artifacts, never
hardcoded here. Coding Conventions is re-read before marking any Task `Done` and is never edited by
coder, even at the user's request — redirect that request to lead-developer.

## Testing & Verification (backend)

Full commands live in Coding Conventions § Local Development Environment; summarized here for the
Implement Task workflow's baseline/post-implementation test runs:

- Test runner: `pytest`, run from `backend/` via `uv run` — integration tests against a real
  in-process SQLite database (`DATABASE_URL="sqlite:///./tests/test.db"`, `PYTHONPATH=.`).
- Full suite: `DATABASE_URL="sqlite:///./tests/test.db" PYTHONPATH=. uv run pytest tests/ -v`
- Story-scoped: substitute `tests/test_<domain>.py` for `tests/`.
- Run the **baseline** before touching code and the **post-implementation** run after — any test
  passing in the baseline and failing after is a regression to fix before marking the Task `Done`;
  pre-existing failures go in the Implementation Report only.
- No dedicated type-checker command is documented for this stack yet; rely on complete type hints
  (mandatory per Coding Conventions § Type Hints) and the test suite as the primary verification
  method. Never use a one-off inline snippet (e.g. `python -c`) as verification.

### Unit Test Mode (TDD)

I write my own unit and integration tests; unit tests are test-first (TDD) — the substantive
convention lives in Coding Conventions, not restated here. For unit tests, invoke
`Skill("superpowers:test-driven-development")` and follow it rather than improvising TDD mechanics
inline.

## Standards I follow (not restated in Coding Conventions)

- REST and MCP share one service layer — when a Task touches an endpoint, implement the behavior
  once in `service.py` and add both a controller route and an MCP tool wrapper where the Task's
  scope calls for both surfaces; never duplicate logic between them.
- `core/` is domain-agnostic; a Task that needs a domain-specific constant, enum, Protocol, or
  helper puts it in that domain's own package, never in `core/`.
- Every DI-provided dependency is resolved through `container/` — never instantiate a service or
  repository directly inside implementation code.
- A decision that crosses repo boundaries (DB tech, auth, deployment, cross-service contract) is
  not mine to make — raise it to architect via the escalation mechanism
  (`.fast-sdlc/escalations/`); a decision that's backend-local but reusable is a candidate for
  lead-developer's repo-level ADR, not something I create myself.
- If a Task's premise doesn't match what's actually in the code, stop and raise it to
  lead-developer — never guess or silently reinterpret the Task.

## Notes carried from the codebase (relevant when implementing backend tasks)

- **No auth by design** — `*_role` fields are descriptive metadata, never access control; never add
  login/roles/RBAC.
- **DB default is PostgreSQL** (ADR-031, STORY-024); SQLite is opt-in and the code fallback. Keep all
  code DB-agnostic — dialect-specific logic stays in `core/database/`.
- **Never edit an applied Alembic migration in place** — ship a corrective revision (ADR-028; this
  has bitten the project twice: `0012_web_ui_role_backfill`, `0014_session_status_backfill`).
- **Attachment content lives on the filesystem**, not the DB; `file_path` must never appear in an
  API response.
- **The utility stores facts; it never enforces process** — no blocking on dependencies, no workflow
  automation, no status-transition rules belong in this codebase's own logic.

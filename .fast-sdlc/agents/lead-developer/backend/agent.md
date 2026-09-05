# lead-developer (backend) — References

Setup completed under STORY-001 / TASK-003 (2026-08-27, SESSION-004). This repo is an
**existing, fully-built system** adopted into `fast-sdlc`. This instance is scoped to the **backend**
stack only (Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · Pydantic v2 · fastmcp); the frontend
React stack is a separate lead-developer instance (`../frontend/`, TASK-009).

## Artifacts I own (backend stack)

### Coding Conventions
- **Location**: `.fast-sdlc/conventions/coding-conventions-backend.md` — moved out of this role's own
  config folder (2026-08-27, user-directed correction) into a shared conventions folder so coder can
  reach it without reaching into another role's folder.
- **Origin**: adopted from the legacy `docs/backend-coding-conventions.md` (534 lines, accurate and
  repo-grounded), relocated here via `git mv` (history preserved). Three factual corrections applied
  on adoption: ownership `backend-developer`→`lead-developer`; `core/config.py`→`app/config.py`
  (settings live at `app/config.py`, top-level, not under `core/`); "app factory"→`app/main.py`
  (there is **no** factory function — `application = FastAPI(...)` is created directly in `main.py`).
- **Format**: the existing document's own structure, kept as-is (richer and more repo-specific than
  the plugin's `coding-conventions-format.md` generic template — deliberately not reformatted).
- **Versioning**: inline header (`Last updated / rev N`) + git history. No separate changelog folder —
  conventions change rarely and git covers provenance.

### Implementation Plan
- **Location**: inside each story's own folder under Task Management —
  `.fast-sdlc/task-management/STORY-NNN-<slug>/implementation-plan-backend.md` (alongside
  `description.md`, architect's `story-implementation-plan.md`, and `tasks/`). The `-backend` suffix
  keeps it distinct from the frontend stack's plan for the same story.
- **Format**: `implementation-plan-format.md` (plugin default, copied into this folder, as-is).
- **Task Management**: file-based (`file-based-task-management`), per `fast-sdlc-project-setup.md`.

### Repo-level ADRs (backend)
- **Location**: `backend/adr-log/` — inside the backend stack folder at the repo root (same pattern as
  `frontend/adr-log/`). Backend-scoped decisions only, distinct from architect's project-level ADR Log
  (`documentation/technical/adr-log/`, ADR-001…031).
- **Numbering**: sequential **within this backend stack**, independent of the project-level series —
  first is `ADR-001`. Check this folder before assigning an id. **None yet.**
- **Format**: `adr-format.md` (plugin default, copied into this folder, as-is). ADR immutability rule
  applies — never edit an ADR body, only its `Status`.

## Standards I follow (not restated in Coding Conventions)
- When I write backend code myself (MODE 5): unit tests are test-first — invoke
  `Skill("superpowers:test-driven-development")`. Substance lives in Coding Conventions § Testing.
- Technical Documentation is architect's territory — read `documentation/technical/sad.md` first,
  the API Contract (`documentation/technical/api-contracts/coordination-service.md`) is **LOCKED**.
- A decision that crosses repo boundaries (DB tech, auth, deployment, cross-service contract) is
  **not** a repo-level ADR — raise it to architect via the escalation mechanism
  (`.fast-sdlc/escalations/`).

## Notes carried from the codebase (relevant when planning backend stories)
- **DB default is PostgreSQL** (ADR-031, STORY-024); SQLite is opt-in and the code fallback. Keep all
  code DB-agnostic — dialect-specific logic stays in `core/database/`.
- **REST and MCP share one service layer** — business logic lives in `service.py` only; both surfaces
  must stay behavior-identical.
- **Never edit an applied Alembic migration in place** — ship a corrective revision (ADR-028; this has
  bitten the project twice: `0012_web_ui_role_backfill`, `0014_session_status_backfill`).
- **No auth by design** — `*_role` fields are descriptive metadata, never access control.

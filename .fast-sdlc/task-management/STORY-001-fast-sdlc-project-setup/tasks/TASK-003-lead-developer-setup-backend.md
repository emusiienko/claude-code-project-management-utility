---
status: Done
assignee: lead-developer
story: STORY-001
stack: backend
---

# TASK-003: lead-developer Setup (backend)

## What to implement
Run the lead-developer role's Setup workflow for this repo, scoped to the **backend** stack: produce
the backend Coding Conventions from its actual codebase, decide whether to adopt or supersede the
existing pre-`fast-sdlc` backend conventions doc, update `CLAUDE.md` for this stack, and produce this
stack's own `agent.md`. This repo has two stacks (backend, frontend); this Task and TASK-009 cover
one instance of lead-developer each, per `sdlc`'s "one instance per repo, scoped to one stack per
session" model.

## Scope
Backend Coding Conventions, Implementation Plan location convention; `CLAUDE.md`; lead-developer's
own backend config folder (`.fast-sdlc/agents/lead-developer/backend/`); the
`fast-sdlc-project-setup.md` > Artifacts chapters this role owns, for the backend stack.

## Dependencies
TASK-002

## Acceptance Criteria
- [ ] Backend Coding Conventions produced/confirmed
- [ ] Decision made on adopting/superseding the existing `docs/backend-coding-conventions.md`
- [ ] `.fast-sdlc/agents/lead-developer/backend/agent.md` produced
- [ ] `fast-sdlc-project-setup.md` > Artifacts updated with confirmed formats/locations for the
      backend stack

## Intended ADR
None

---
## Implementation Report
**Date**: 2026-08-27 (SESSION-004)

**What was done**:
- Ran lead-developer Setup for the **backend** stack. Explored the real `backend/` codebase
  (`pyproject.toml`, `app/` structure, `app/main.py`, `app/api/`) to ground every decision.
- Adopted the legacy `docs/backend-coding-conventions.md` (534 lines, accurate and repo-grounded) as
  the fast-sdlc backend Coding Conventions, **relocated** via `git mv` to
  `.fast-sdlc/agents/lead-developer/backend/coding-conventions.md` (history preserved).
- Applied three factual corrections on adoption (see Technical decisions).
- Copied the plugin format templates as-is into the role folder
  (`implementation-plan-format.md`, `adr-format.md`) and created the empty backend `adr-log/`.
- Produced `.fast-sdlc/agents/lead-developer/backend/agent.md` (References).
- Updated `CLAUDE.md` Key Docs pointer to the new conventions location + corrected ownership.
- Filled the Coding Conventions / Implementation Plan / Repo-level ADRs chapters in
  `fast-sdlc-project-setup.md` > Artifacts for the backend stack (frontend left TBD for TASK-009).

**Deviations from plan**:
- The task/briefing anticipated a possible "adopt or supersede" decision on the legacy doc. Outcome:
  **adopt-and-relocate** (user choice) rather than regenerate from the plugin template — the existing
  doc is materially richer and repo-specific. The legacy `docs/backend-coding-conventions.md` no
  longer exists (moved, not kept as a historical duplicate) to preserve a single source of truth.

**Technical decisions made**:
- Coding Conventions live in the role's own folder (`.fast-sdlc/agents/lead-developer/backend/`),
  mirroring how architect's artifacts are co-located; `docs/` treated as legacy.
- Corrections applied (validated against the code): ownership `backend-developer`→`lead-developer`;
  `core/config.py`→`app/config.py` (settings are top-level, confirmed in `app/main.py` imports);
  "app factory"→`app/main.py` (no factory — `application = FastAPI(...)` created directly, grep
  confirmed). Black/isort tooling in the doc verified against `pyproject.toml` (line-length 88,
  py312, isort `profile=black`).
- Implementation Plan: inside the story folder, `implementation-plan-backend.md` (stack-suffixed).
- Repo-level ADRs: backend-scoped, independent numbering from `ADR-001`, in the role folder.
- Versioning for conventions: inline `rev N` header + git; no separate changelog folder.

**Code locations**:
- `.fast-sdlc/agents/lead-developer/backend/coding-conventions.md` (moved + corrected, rev 9)
- `.fast-sdlc/agents/lead-developer/backend/agent.md` (new)
- `.fast-sdlc/agents/lead-developer/backend/{implementation-plan-format.md,adr-format.md}` (new)
- `backend/adr-log/index.md` (new — see Post-completion correction below)
- `fast-sdlc-project-setup.md` > Artifacts (Coding Conventions / Implementation Plan / Repo-level ADRs)
- `CLAUDE.md` > Key Docs (backend conventions pointer)

**Technical debt noted**:
- Frontend stack Setup still pending (TASK-009) — its Coding Conventions / Implementation Plan /
  Repo-level ADRs chapters remain TBD in `fast-sdlc-project-setup.md`.
- No CI (`.github/workflows/` absent). The conventions' Git section ("no direct commits to main",
  "no --no-verify") is currently policy-only, unenforced by tooling.

**Post-completion correction (2026-08-27, no new Task — user-directed)**:
- The backend Repo-level ADR log was originally created at
  `.fast-sdlc/agents/lead-developer/backend/adr-log/` (inside this role's own config folder) — a
  misreading of the user's intent, which was the project's **actual root `backend/` folder**. Corrected
  to `backend/adr-log/`, matching the pattern the frontend stack's Setup (TASK-009) used
  (`frontend/adr-log/`). The empty misplaced folder was removed; `agent.md` and
  `fast-sdlc-project-setup.md` > Artifacts > Repo-level ADRs updated. No ADRs existed, so nothing was
  moved. `CLAUDE.md` needed no change (it carries no per-stack ADR-log pointer, for either stack).

**Post-completion correction 2 (2026-08-27, no new Task — user-directed, orchestrator-applied)**:
- Coding Conventions moved out of this role's own config folder into a shared conventions folder so
  coder can reach it without reaching into another role's folder: relocated from
  `.fast-sdlc/agents/lead-developer/backend/coding-conventions.md` to
  `.fast-sdlc/conventions/coding-conventions-backend.md` (`git mv`, history preserved — two path
  revisions along the way per user feedback, this is the final one). `agent.md`,
  `fast-sdlc-project-setup.md` > Artifacts > Coding Conventions, and `CLAUDE.md` > Key Docs updated to
  the new path.

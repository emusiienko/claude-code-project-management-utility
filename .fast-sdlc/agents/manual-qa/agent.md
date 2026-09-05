# manual-qa — References

Setup completed under STORY-001 / TASK-007 (2026-08-27, SESSION-009). This repo is an **existing,
fully-built system** adopted into `fast-sdlc`. A mature manual QA strategy and a 191-case test
registry already existed from the prior process; this Setup **adopted** that as-built reality —
relocating it into the `fast-sdlc` file layout and correcting only what had actually changed (team
role names, artifact paths) — rather than re-deriving it from scratch.

## Artifacts I own

### QA Strategy
- **Location**: `.fast-sdlc/conventions/qa-strategy.md` — the shared conventions folder (alongside
  `coding-conventions-backend.md` / `coding-conventions-frontend.md` / `devops-strategy.md`), so any
  role can read it without reaching into this role's own agent folder.
- **Origin**: relocated from legacy `docs/qa-strategy.md` via `git mv` (history preserved). Content
  adopted as-is except: (1) the Bug Assignment Policy's `frontend-developer`/`backend-developer`
  assignees were remapped to `coder` (frontend)/`coder` (backend) — this project's team no longer has
  those standalone roles, implementation is done by stack-scoped `coder` instances; (2) the Test Run
  Process was updated for this project's actual story-status model (no separate `QA ✓` column — the
  story `status` itself becomes `Approved`, per `file-based-task-management`); (3) an Artifact
  Locations section and a draft-TC-workflow note were added (see below); (4) the Screens in Scope
  table was flagged stale (predates STORY-016/STORY-022 nav changes) rather than rewritten — the test
  case registry itself already tracks that drift TC-by-TC and is the source of truth for current
  routes.
- **Format**: the document's own structure, kept as-is — not reformatted into a generic template.

### Test Case Registry
- **Master index**: `qa/test-cases.md` — a new top-level folder at the repo root (sibling of `docs/`
  and `documentation/`), per explicit user decision at TASK-007/SESSION-009 — not nested inside
  `docs/` nor inside this role's own `.fast-sdlc/agents/manual-qa/` folder.
- **Individual TC files**: `qa/test-cases/TC-NNN-<slug>.md` — 191 cases relocated as-is via `git mv`
  (`TC-001`…`TC-191`), covering every story built so far (STORY-002 through STORY-024/STORY-022).
- **Run results (temp)**: `qa/results/` — relocated via `git mv`; existing historical run logs and
  screenshots kept as-is (their internal path references to the old `docs/qa/...` location are
  historical record, not corrected).
- **No separate draft-TC location** (deviation from the generic MODE 2 flow described in my own role
  instructions): per the user's explicit decision, Check Story — Prepare writes test cases directly
  into `qa/test-cases/` and `qa/test-cases.md` — global `TC-NNN` assigned immediately, no local
  per-story numbering, no story-scoped draft index. The story's Prepare task (if one exists) lists the
  resulting TC ids in its Implementation Report. Reconcile for a story therefore skips the merge step
  entirely and only prunes stale cases (`Inactive`) + marks `QA Rec ✓`.

## Known follow-up (not fixed by me — outside my ownership)
- `CLAUDE.md`'s `## Infrastructure` section (devops-owned) still points at the old
  `docs/qa-strategy.md` path in its "Exception: manual-qa drives a browser..." note. I did not edit
  it — CLAUDE.md is architect-owned (devops: Infrastructure section only; manual-qa owns neither).
  Flagged here for devops/architect to correct the pointer to
  `.fast-sdlc/conventions/qa-strategy.md`.

## Standards I follow
- Exploratory, scenario-based testing through the real UI (Playwright) — never automated test code,
  never source-code review, never DB/script access. See my own role instructions for the full
  Execution Map (official interface / primary tool set / secondary tool set) and Visual Testing
  Guidelines.
- The only story status I ever set is `Approved`, and only when a Check Story — Execute round is
  fully clean (all TCs pass, no bug left open in any status other than `resolved`/`wont-fix`).
- Dev stack (`:3100` web / `:8100` backend/MCP) is the default target for every test run; prod
  (`:3000`/`:8000`) only on explicit user request. See QA Strategy § Target Environment.

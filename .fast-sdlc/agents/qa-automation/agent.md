# qa-automation — References

Setup completed under STORY-001 / TASK-006 (2026-08-27, SESSION-010). This repo is an **existing,
fully-built system** adopted into `fast-sdlc`. A prior-process artifact, `docs/qa-automation-strategy.md`,
claimed ownership of the `backend/tests/` integration suite — but by the time this Setup ran,
`lead-developer`/`coder` (backend) had already reassigned that suite to `coder` in
`.fast-sdlc/conventions/coding-conventions-backend.md` § Testing. This Setup **did not adopt** the
legacy strategy's ownership model; it wrote a genuinely new, black-box-only strategy and suite. See
§ Decisions below.

## Artifacts I own

### Automation Strategy
- **Location**: `.fast-sdlc/agents/qa-automation/strategy.md` (this role's own config folder — the
  strategy doc is small enough, and specific enough to this role, that it doesn't need the shared
  `.fast-sdlc/conventions/` folder the way the coding-conventions/devops/QA strategy docs do; nothing
  else needs to read it directly, only reference its existence).
- **Format**: own structure — framework, scope, test suite location, target environment, auth, CI,
  bug assignment policy, test conventions, known quirks/divergences pointer.

### Test Suite
- **Location**: `automation/` at the repo root (sibling of `backend/`, `frontend/`, `docs/`,
  `documentation/`) — a runnable npm project, not nested inside this role's own config folder. See
  strategy.md § Test Suite Location for the reasoning (mirrors why manual-qa's `qa/` registry is also
  top-level).
- **Framework**: `@playwright/test` (TypeScript), `request` fixture only — no browser.
- **Coverage**: one spec file per API Contract domain (12 total — Projects, Stories, Tasks, Task
  Links, Story Links, Attachments, Comments, Sessions, Settings, Milestones, Cross-project Queries,
  Status), pragmatic depth per domain. 56 tests, 53 passing, 3 `test.fixme()` — see Known Divergences
  below.
- **Run**: `cd automation && npm install && npm test` against the dev stack (`:8100`), confirmed
  working end-to-end during this Setup.

## Decisions made (SESSION-010)

1. **Superseded, not adopted, the legacy `docs/qa-automation-strategy.md`.** Its `backend/tests/`
   integration suite (14 pytest files) is real, valuable work — but it was authored under a process
   where qa-automation owned integration tests, which conflicts with this project's now-`fast-sdlc`
   convention that the implementor (`coder`) writes its own unit and integration tests as part of the
   same Task. `coder`'s backend Coding Conventions had already resolved this (its own Testing section
   claims `backend/tests/` explicitly) by the time this Setup ran, so there was nothing left to
   reconcile there — I only needed to make sure my own new strategy doesn't restate or re-claim that
   ownership. `docs/qa-automation-strategy.md` is left as historical record, unedited.
2. **New test suite lives at `automation/` (repo root), not inside my own `.fast-sdlc/agents/qa-automation/`
   folder** — confirmed with the user (it's a runnable artifact, like `backend/`/`frontend/`, not
   role configuration).
3. **Framework confirmed with the user**: `@playwright/test` / TypeScript, per this role's own default.
4. **Initial coverage scope confirmed with the user**: pragmatic per-domain depth (happy path + key
   validation/error cases from the contract text) across all 12 domains, not exhaustive per-endpoint
   coverage — the exhaustive depth already exists in `coder`'s own `backend/tests/`.

## Known Divergences found during this Setup (not filed as formal Bugs)

Running the initial suite against the live dev stack surfaced three places where the **LOCKED**
`documentation/technical/api-contracts/coordination-service.md` does not match the running backend
(confirmed against its live `/v1/openapi.json`, not a suite bug):

- `GET /stories` without `project_id` — contract: cross-project list; as-built: `422` (`project_id`
  required).
- `GET /tasks` without `project_id` (bare collection) — contract: cross-project list; as-built: route
  does not exist (`404`).
- `GET /tasks/:id/dependencies` — contract: `TaskDependencies` read; as-built: route does not exist
  (`404`).

Not filed as formal Bugs — there is no story in scope to attach them to (this surfaced during Project
Setup, not a story's Prepare/Execute cycle). Flagged here, in `automation/README.md`, and in this
session's report for the user/architect to decide: back-fill the missing routes, or revise the
contract to as-built. The three corresponding tests are marked `test.fixme()` with inline comments
pointing at this record.

## Standards I follow

- Black-box only, against the running dev stack (`:8100`) — never source code, never the DB, never
  `backend/tests/` or `frontend/src/**/*.test.*`. See my own role instructions (system prompt) for
  the full MODE 1–4 workflow.
- No auth headers — the app has no auth, by design.
- No prod-stack exception (unlike `manual-qa`) — I only ever target the dev checkout.
- A contract-documented endpoint that doesn't exist or behaves differently as built is a legitimate
  finding, marked `test.fixme()` with a comment, not silently deleted or left failing unexplained.

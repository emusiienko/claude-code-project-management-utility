# qa-automation Strategy

> Owned by **qa-automation**. Update only at the user's explicit request.
> Stack: TypeScript · `@playwright/test` (`request` fixture — API testing, no browser)
> Set: 2026-08-27 (STORY-001/TASK-006, SESSION-010). Supersedes the legacy `docs/qa-automation-strategy.md`
> — see § Relationship to the Legacy Strategy below.

---

## Scope

Black-box, external verification of the **running system's actual API surface** — one repo/service
today (the Coordination Service backend), potentially more if this project ever grows a second
service. This suite exists to catch what no single repo's own test suite can: whether each service's
API Contract is honored end-to-end, and whether services interoperate. It is **not** a substitute for,
or a duplicate of, the implementor's own unit/integration tests.

| Layer | Covered here? | Owner |
|---|---|---|
| REST API contract conformance (status codes, response shapes, error codes) | **Yes** | qa-automation |
| Cross-cutting/cross-service behavior | **Yes** (none exist yet — single-service project) | qa-automation |
| Backend unit tests (`backend/tests/unit/`) | No | `coder` (backend) |
| Backend integration tests (`backend/tests/test_*.py`) | No | `coder` (backend) |
| Frontend unit tests (`frontend/src/**/*.test.*`) | No | `coder` (frontend) |
| MCP tool surface | Not yet — REST coverage is the same service layer; add a smoke pass if MCP-specific bugs ever surface | — |
| Browser/UI/visual testing | No | `manual-qa` |
| Load/performance testing | No | out of scope (non-functional targets validated manually) |

**I never add or edit files under `backend/tests/` or any `frontend/src/**/*.test.*` file.** Those are
the implementor's, written test-first as part of the same Task/Quick Fix/Bug Fix that changes the
code (`.fast-sdlc/conventions/coding-conventions-backend.md` § Testing > Ownership).

---

## Relationship to the Legacy Strategy

The prior process's `docs/qa-automation-strategy.md` documented a mature `backend/tests/` pytest
integration suite (14 files, one per domain) as **qa-automation-owned**. That ownership model is
superseded, not adopted:

- `lead-developer` (backend), while writing this stack's Coding Conventions, added a Testing section
  making `backend/tests/` (both new `tests/unit/` and the existing flat `tests/test_*.py` layout)
  `coder`'s responsibility going forward — including "extend and correct [the existing suite] in
  place," since it was already good work, just under the wrong long-term owner.
- This strategy **does not claim ownership of `backend/tests/`**, and this Setup did not move,
  duplicate, or delete anything under it.
- `docs/qa-automation-strategy.md` itself is left in place as historical record of the pre-`fast-sdlc`
  process, not written to going forward (same treatment as the other legacy `docs/` artifacts per
  `fast-sdlc-project-setup.md`).
- This is a genuinely new artifact, not a relocation: the black-box suite it describes
  (`automation/`) did not exist under the legacy process at all.

---

## Framework

`@playwright/test` with the `request` fixture — pure HTTP API testing, no browser. TypeScript,
matching the frontend stack's own language (`dotenv` for local `.env` overrides).

## Test Suite Location

`automation/` at the repo root — a sibling of `backend/`, `frontend/`, `docs/`, `documentation/` — its
own npm project (`package.json`, `tsconfig.json`, `playwright.config.ts`). Not nested inside
`.fast-sdlc/agents/qa-automation/`: it is a runnable artifact (like `backend/`/`frontend/`), not
role configuration, mirroring why `manual-qa`'s `qa/` test-case registry also lives at the repo root
rather than inside that role's own config folder.

```
automation/
  playwright.config.ts
  package.json / tsconfig.json / .env.example / .gitignore
  utils/helpers.ts        # shared fixture creators — one per entity, appends a unique suffix
  tests/<domain>.spec.ts  # one file per API Contract "##" section
  README.md               # quick start + Known Quirks + Known Divergences (see below)
```

One spec file per **contract domain**, not per backend module — `tests/` mirrors
`documentation/technical/api-contracts/coordination-service.md`'s own `##` headings (Projects,
Stories, Tasks, Task Links, Story Links, Attachments, Comments, Sessions, Settings, Milestones,
Cross-project Queries, Status).

## Target Environment

**Dev stack only** — `http://localhost:8100` (backend + path-mounted MCP), configured via
`API_BASE_URL` (`automation/.env`, default already points at dev). Per `CLAUDE.md` > Infrastructure,
qa-automation is confined to the dev checkout the same way `devops`/`coder` are — there is **no**
prod-target exception the way `manual-qa` has one (manual-qa drives a browser and can be explicitly
asked to point at prod for a specific check; qa-automation's run command has no such override path in
its own workflow, only the env var for local experimentation). Bring the dev stack up first
(`./deploy.sh up`, a user step) before running this suite.

## Authentication

None — the application has no auth by design (localhost-only Docker port mapping is the only access
boundary; see `CLAUDE.md` > Gotchas). Tests never set an `Authorization` header.

## CI Integration

**No CI service** for this project (`.fast-sdlc/conventions/devops-strategy.md` — quality gates are
local pre-commit hooks only, solo/localhost-only repo). The run command below is executed manually,
by whoever is doing a Check Story — Execute round:

```bash
cd automation
npm install   # first run / after a dependency change
npm test      # full suite, requires the dev stack up
```

If this project ever adds a CI service, `npm test` is the exact command to wire in, with
`API_BASE_URL` pointed at whatever backend the CI job stands up.

## Bug Assignment Policy

Team role names on this project are `coder` (scoped per stack) and `devops` — not
`backend-developer`/`frontend-developer` (mirrors `manual-qa`'s own remap in its QA Strategy).

| Failure domain | Assignee |
|---|---|
| Wrong HTTP status / response shape / error code — REST contract violation | `coder` (backend) |
| Endpoint documented in the contract but missing/behaving differently as built | `coder` (backend) — or `TBD` if it looks like the contract itself is stale (architect's call) |
| Infrastructure (stack won't start, DB connection, migration failure) | `devops` |
| Test script itself (wrong assertion, stale fixture, flaky wait) | `qa-automation` (self) |
| Ambiguous / spans multiple layers | `TBD` — escalate to user |

## Test Conventions

- **Black-box only.** Every test hits real HTTP endpoints on the running dev stack; nothing imports
  from `backend/app/` or `frontend/src/`, nothing touches the DB directly.
- **Self-contained fixtures.** Each test creates the data it needs via `utils/helpers.ts` (which
  suffixes uniqueness-constrained fields, e.g. project/milestone names, with a random token) — no
  shared seed data, no execution-order dependency. The suite runs `fullyParallel`.
- **One behavior per test**, named for what it asserts (e.g. `"duplicate name (case-insensitive)
  conflicts with 409"`).
- **Assert on the contract's documented shape** — status code, `code` in the error envelope, response
  field values — never on incidental details the contract doesn't promise.
- **A contract-documented endpoint that doesn't exist or doesn't behave as documented is a legitimate,
  valuable finding** — mark it `test.fixme(true, "<reason>")` inside the test body (not the file/describe
  scope — that would silently skip every later test in the block) with a comment explaining the
  divergence, rather than deleting or silently passing the test. See `automation/README.md` § Known
  Divergences for the current list.

## Initial Coverage (Setup, 2026-08-27)

Since the API Contract already had full content when this Setup ran (an existing, fully-built
system), this Setup wrote initial tests for **every contract domain** rather than starting from an
empty suite — pragmatic depth per domain (happy-path CRUD + the domain's key validation/error/edge
cases from the contract text), not exhaustive per-endpoint coverage of every filter/boundary
combination (that exhaustive depth already exists in `coder`'s own `backend/tests/`, which this suite
deliberately does not duplicate). 56 tests across 12 spec files; 53 pass, 3 are `test.fixme()` pending
an architect decision (see `automation/README.md` § Known Divergences). Story-scoped work going
forward follows the normal Prepare/Execute modes — this initial pass is not a substitute for
acceptance-criteria-driven coverage per story.

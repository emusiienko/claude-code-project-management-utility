# qa-automation Test Suite

Black-box API test suite for the **Coordination Service**, owned by **qa-automation**. It verifies
the REST surface against `documentation/technical/api-contracts/coordination-service.md` end-to-end,
against the **running dev stack** — never the DB, never internals, never `backend/tests/` or
`frontend/src/**/*.test.*` (those are `coder`'s, per `.fast-sdlc/conventions/coding-conventions-backend.md`
§ Testing > Ownership).

Full strategy (framework choice, scope, environments, bug policy, CI): see
`.fast-sdlc/conventions/qa-automation-strategy.md`.

## Quick start

```bash
cd automation
npm install
npm test              # runs the full suite against http://localhost:8100 (dev stack)
npm run report        # opens the last HTML report
```

Override the target with `API_BASE_URL` (copy `.env.example` to `.env`, or export it inline) — but
this suite only ever targets the **dev checkout**; see § Target Environment below.

## Target Environment

Dev stack only (`http://localhost:8100`, backend + path-mounted MCP). Per `CLAUDE.md` >
Infrastructure, qa-automation is confined to the dev checkout the same way `devops`/`coder` are —
there is no prod-target exception here the way `manual-qa` has one. Bring the dev stack up first
(`./deploy.sh up`, run by the user) before running this suite.

## Known Quirks (as-built backend, not part of the contract)

- **Every path must be prefixed `/v1`** — the contract's endpoint paths (e.g. `POST /projects`) omit
  the version prefix the running backend actually requires (`POST /v1/projects`). All test files and
  `utils/helpers.ts` already account for this.
- **`/v1/projects` (the bare collection route) requires a trailing slash** to avoid a `307` redirect
  that drops the POST body on this backend — unlike every other collection route in the contract
  (`/v1/stories`, `/v1/milestones`, `/v1/sessions`, … all work with or without one). `createProject()`
  in `utils/helpers.ts` already posts to `/v1/projects/`.

## Retired Contract Reads (historical — resolved at STORY-001 Reconcile)

Three reads were found during Setup (2026-08-27) to be specified in the contract but never built,
confirmed against the live OpenAPI schema (`/v1/openapi.json`): the cross-project `GET /stories`
(omitting `project_id`), the top-level `GET /tasks` collection, and `GET /tasks/:id/dependencies`.
They were originally covered here by three `test.fixme()` tests awaiting an architect decision.

At STORY-001 Reconcile the user decided to **retire these reads from the contract outright** (v1.10)
rather than back-fill them — they were never wanted, so the contract no longer promises them. As a
result the corresponding tests are gone, not skipped: the whole `Cross-project Queries` domain
(`tests/cross-project.spec.ts`) was deleted, and the `GET /tasks/:id/dependencies` test was removed
from `tests/tasks.spec.ts` (a short comment there points to the contract's v1.10 changelog entry for
context). See `documentation/technical/api-contracts/coordination-service.md` § Versioning & status
for the full as-built rationale — a project-wide breadth read is now served by
`GET /projects/:id/work-state`, and task dependency information via `GET /tasks/:id/detail`'s `links`.

## Structure

```
automation/
  playwright.config.ts   # baseURL from API_BASE_URL (default http://localhost:8100), no auth headers
  utils/helpers.ts        # shared fixture creators (createProject, createStory, createTask, ...)
  tests/
    status.spec.ts
    projects.spec.ts
    stories.spec.ts
    tasks.spec.ts
    task-links.spec.ts
    story-links.spec.ts
    attachments.spec.ts
    comments.spec.ts
    sessions.spec.ts
    settings.spec.ts
    milestones.spec.ts
    mcp.spec.ts
```

One spec file per API contract domain — mirrors the contract's own `##` section headings, not the
backend's internal module layout. Every test creates its own fixtures (via `utils/helpers.ts`) and
never depends on execution order or another test's data — tests run `fullyParallel`.

`mcp.spec.ts` is the exception to "one file per domain": it's a transport-level smoke pass (STORY-011,
2026-09-30) added once an MCP-specific bug actually surfaced, per the qa-automation strategy's MCP
scope note. It uses the official `@modelcontextprotocol/sdk` client (`StreamableHTTPClientTransport`)
instead of the `request` fixture — streamable-HTTP is a stateful protocol the plain fixture can't
negotiate — to prove a **real** over-the-wire MCP client can complete `initialize` and call a tool
against the running app, the one thing `backend/tests/`'s in-process `fastmcp.Client(mcp_server_v1)`
tests structurally cannot cover. Targets `/mcp/v1`, confirmed as the canonical mount path (ADR-032,
API Contract v1.12).

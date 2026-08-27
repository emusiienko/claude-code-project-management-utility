# qa-automation Test Suite

Black-box API test suite for the **Coordination Service**, owned by **qa-automation**. It verifies
the REST surface against `documentation/technical/api-contracts/coordination-service.md` end-to-end,
against the **running dev stack** — never the DB, never internals, never `backend/tests/` or
`frontend/src/**/*.test.*` (those are `coder`'s, per `.fast-sdlc/conventions/coding-conventions-backend.md`
§ Testing > Ownership).

Full strategy (framework choice, scope, environments, bug policy, CI): see
`.fast-sdlc/agents/qa-automation/strategy.md`.

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

## Known Divergences From the LOCKED Contract (found during Setup, 2026-08-27)

Three tests are marked `test.fixme()` — they encode contract-documented behavior that does not exist
on the running backend, confirmed against its live OpenAPI schema (`/v1/openapi.json`), not just a
suite bug:

| Contract section | Documented behavior | As-built |
|---|---|---|
| Cross-project Queries — `GET /stories` | Omitting `project_id` returns stories across all projects | `422 VALIDATION_ERROR` — `project_id` is required |
| Cross-project Queries — `GET /tasks` | Omitting `project_id` returns tasks across all projects | Route does not exist at all (`404`, absent from the OpenAPI schema) |
| Tasks — `GET /tasks/:id/dependencies` | Returns `TaskDependencies` (raw inbound-depends-on data) | Route does not exist at all (`404`, absent from the OpenAPI schema) |

These were flagged to the user in the Setup session report (`.fast-sdlc/sessions/SESSION-010-*.md`)
rather than filed as formal Bugs — there is no story in scope to attach them to (Project Setup is not
a story's Prepare/Execute cycle). The architect should either back-fill the missing routes or revise
the contract to as-built; once resolved, un-`fixme` the corresponding tests in `tests/cross-project.spec.ts`
and `tests/tasks.spec.ts`.

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
    cross-project.spec.ts
```

One spec file per API contract domain — mirrors the contract's own `##` section headings, not the
backend's internal module layout. Every test creates its own fixtures (via `utils/helpers.ts`) and
never depends on execution order or another test's data — tests run `fullyParallel`.

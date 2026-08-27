---
status: Done
assignee: qa-automation
story: STORY-001
---

# TASK-006: qa-automation Setup

## What to implement
Run the qa-automation role's Setup workflow: decide whether to adopt or supersede the existing
automation strategy and test suite, and produce this role's own `agent.md`.

## Scope
Automation strategy, test suite scaffold; qa-automation's own config folder
(`.fast-sdlc/agents/qa-automation/`).

## Dependencies
TASK-003

## Acceptance Criteria
- [x] Automation strategy confirmed/updated with the user
- [x] Decision made on adopting/superseding the existing `docs/qa-automation-strategy.md`
- [x] `.fast-sdlc/agents/qa-automation/agent.md` produced

## Intended ADR
None

---
## Implementation Report
**Date**: 2026-08-27 (SESSION-010)

**What was done**: Ran qa-automation's Setup workflow (Mode 1). Read
`.fast-sdlc/conventions/coding-conventions-backend.md` § Testing, the legacy
`docs/qa-automation-strategy.md`, `.fast-sdlc/conventions/qa-strategy.md` (manual-qa's own relocated
strategy, as a structural reference), `fast-sdlc-project-setup.md` § Artifacts, and the full API
Contract (`documentation/technical/api-contracts/coordination-service.md`, v1.9, all 12 domains).
Confirmed with the user (single batch): framework (`@playwright/test`/TypeScript, `request` fixture),
test suite location (`automation/` at the repo root, not nested in this role's config folder), and
initial-coverage scope (pragmatic per-domain depth, not exhaustive per-endpoint). Decided to
**supersede, not adopt**, the legacy strategy's ownership model — `backend/tests/` had already been
reassigned to `coder` (backend) by lead-developer's own Setup, so the new strategy simply doesn't
re-claim it; the legacy file is left as historical record. Produced: `.fast-sdlc/agents/qa-automation/strategy.md`,
`.fast-sdlc/agents/qa-automation/agent.md`, the `automation/` npm project (12 spec files covering
Status/Projects/Stories/Tasks/Task Links/Story Links/Attachments/Comments/Sessions/Settings/Milestones/Cross-project
Queries — 56 tests), `automation/README.md`, and a new "QA Automation Strategy" + "Automation Test
Suite" chapter pair in `fast-sdlc-project-setup.md` § Artifacts. Ran the full suite against the dev
stack (`:8100`, already up): 53 pass, 3 `test.fixme()`.

**Deviations from plan**: While standing the suite up, discovered two as-built backend quirks not in
the contract (documented in `automation/README.md` § Known Quirks and reflected in `utils/helpers.ts`
comments, not filed as bugs — they're transport-level, not contract violations): every route needs a
`/v1` prefix the contract's endpoint paths omit, and the bare `/v1/projects` collection route 307s
without a trailing slash (unlike every other collection route), which silently drops a POST body
unless followed. More significantly, running the suite surfaced three genuine **contract-vs-as-built
divergences** (confirmed against the live `/v1/openapi.json`, not a suite bug): `GET /stories` and
`GET /tasks` don't support the documented cross-project (no-`project_id`) read, and
`GET /tasks/:id/dependencies` doesn't exist at all. These are marked `test.fixme()` with inline
comments rather than filed as formal Bugs (no story in scope to attach them to during Project Setup)
— flagged to the user in this session's report and in `automation/README.md` § Known Divergences for
architect follow-up.

**Technical decisions made**: See `.fast-sdlc/agents/qa-automation/agent.md` § Decisions made — none
required a formal ADR (Setup produces reference/strategy artifacts and test code, not an architecture
or infrastructure decision).

**Code locations**: `automation/` (new npm project — `playwright.config.ts`, `utils/helpers.ts`,
`tests/*.spec.ts` × 12, `README.md`, `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`);
`.fast-sdlc/agents/qa-automation/strategy.md` (new); `.fast-sdlc/agents/qa-automation/agent.md` (new);
`fast-sdlc-project-setup.md` (edited — two new Artifacts chapters).

**Technical debt noted**: The three contract-vs-as-built divergences above (cross-project
`GET /stories`/`GET /tasks`, `GET /tasks/:id/dependencies`) are unresolved — not created by this Task,
found by it. No dedicated automated coverage exists yet for the MCP tool surface (REST-only for now,
per the strategy's Scope table) or for a future second service, should this project ever grow one.

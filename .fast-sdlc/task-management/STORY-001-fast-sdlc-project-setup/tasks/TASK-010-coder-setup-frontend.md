---
status: Done
assignee: coder
story: STORY-001
---

# TASK-010: coder Setup (frontend)

## What to implement
Run the coder role's Setup workflow, scoped to the **frontend** stack: produce this stack's own
`agent.md` — the conventions and standards it follows when implementing Tasks in this repo's frontend.
This repo has two stacks (backend, frontend); this Task and TASK-004 cover one instance of coder each,
per `sdlc`'s "one instance per repo, scoped to one stack per session" model.

## Scope
coder's own frontend config folder (`.fast-sdlc/agents/coder/frontend/`).

## Dependencies
TASK-009

## Acceptance Criteria
- [x] `.fast-sdlc/agents/coder/frontend/agent.md` produced

## Intended ADR
None

---
## Implementation Report
**Date**: 2026-08-27 (SESSION-007)

**What was done**: Ran coder's Setup workflow scoped to the frontend stack. Read the frontend Coding
Conventions (`.fast-sdlc/conventions/coding-conventions-frontend.md`), `fast-sdlc-project-setup.md` §
Artifacts, the backend coder instance's `agent.md` (TASK-004) as a structural reference, and the
frontend `package.json`/`vitest.config.ts`/`docs/qa-automation-strategy.md` to confirm the actual test
tooling and run commands. Produced `.fast-sdlc/agents/coder/frontend/agent.md` covering: artifacts
read (not owned), Testing & Verification (Vitest + RTL run commands, `tsc --noEmit` type check,
baseline/post-implementation regression policy), standards not restated in the Coding Conventions
(layering, `shared`/`features` visibility, config-constant single-source rules, escalation vs.
repo-level-ADR boundary), and notes carried from the codebase relevant to frontend Tasks (no auth, 3
top-level nav items, no dark mode, no global state store, shared `IconButton`, known clear-override
gap). Verified the documented `npx vitest run` command actually works: 22 test files / 252 tests, all
passing.

**Deviations from plan**: The Coding Conventions' § "Testing Guidance" is headed *"for QA — do not
write tests yourself"*, conflicting with coder's default SDLC responsibility to write its own tests.
Raised this to the user before finalizing the agent.md; resolved via explicit user decision (session
Q&A) that coder (frontend) writes tests itself, test-first (TDD), for every Task/Quick Fix/Bug Fix on
this stack — recorded as a "Convention Gap" section in the agent.md rather than silently picking one
side.

**Technical decisions made**: None requiring an ADR (Setup produces reference documentation only, no
code/architecture decision).

**Code locations**: `.fast-sdlc/agents/coder/frontend/agent.md` (new).

**Technical debt noted**: None new. Carried forward from the codebase (documented in the new
agent.md's Notes section, not created by this Task): the clear-override end-to-end gap (STORY-002).

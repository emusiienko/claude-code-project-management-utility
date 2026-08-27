---
status: Done
assignee: coder
story: STORY-001
---

# TASK-004: coder Setup (backend)

## What to implement
Run the coder role's Setup workflow, scoped to the **backend** stack: produce this stack's own
`agent.md` — the conventions and standards it follows when implementing Tasks in this repo's backend.
This repo has two stacks (backend, frontend); this Task and TASK-010 cover one instance of coder each,
per `sdlc`'s "one instance per repo, scoped to one stack per session" model.

## Scope
coder's own backend config folder (`.fast-sdlc/agents/coder/backend/`).

## Dependencies
TASK-003

## Acceptance Criteria
- [x] `.fast-sdlc/agents/coder/backend/agent.md` produced

## Intended ADR
None

---
## Implementation Report
**Date**: 2026-08-27
**What was done**: Ran coder's Setup workflow for the backend stack (SESSION-006). Read
`fast-sdlc-project-setup.md`, the backend Coding Conventions
(`.fast-sdlc/conventions/coding-conventions-backend.md`), and lead-developer (backend)'s own
`agent.md` as a format reference. Produced `.fast-sdlc/agents/coder/backend/agent.md`: References
document covering artifact pointers (resolved from `fast-sdlc-project-setup.md`, not hardcoded),
backend testing/verification commands for the Implement Task workflow's baseline/post-implementation
runs, standards not restated in Coding Conventions (REST/MCP single service layer, `core/`
domain-agnosticism, DI-only instantiation, escalation boundary), and codebase gotchas relevant to
implementation work (no-auth-by-design, DB portability, migration immutability, attachment storage,
facts-not-process).
**Deviations from plan**: None. One round of user feedback during drafting: the "Artifacts I read"
section was tightened to point at `fast-sdlc-project-setup.md` § Artifacts rather than restate
locations already defined there — applied before finalizing.
**Technical decisions made**: Kept the References file artifact-location-free where a locations table
already exists in `fast-sdlc-project-setup.md`, to avoid a second source of truth that could drift;
duplicated only the testing commands (condensed) since those are operationally needed on every Task
and not otherwise indexed for quick reference.
**Code locations**: `.fast-sdlc/agents/coder/backend/agent.md` (new).
**Technical debt noted**: None. Note for future coder Tasks: no dedicated static type-checker command
is documented for the backend stack yet — flagged in the new `agent.md` rather than invented here,
since introducing one is lead-developer's/devops' call, not coder's.

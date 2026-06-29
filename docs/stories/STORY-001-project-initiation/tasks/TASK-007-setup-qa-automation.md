---
status: Done
assignee: qa-automation
story: STORY-001
---

# TASK-007: Setup — qa-automation

## What to implement
Run the qa-automation Setup workflow: produce docs/qa-automation-strategy.md and optionally initialize a test suite scaffold, then pause for user approval.

## Scope
docs/qa-automation-strategy.md

## Dependencies
TASK-003

## Acceptance Criteria
- [ ] docs/qa-automation-strategy.md created
- [ ] User has reviewed and approved the QA automation strategy

---
## Implementation Report
**Date**: 2026-06-29
**What was done**: Created `docs/qa-automation-strategy.md` (rev 4) covering two test layers: backend REST API integration tests (pytest + httpx + pytest-asyncio) and frontend unit tests (Vitest + React Testing Library). Defined test file structure, environment configuration, run commands, coverage zones per story, bug assignment policy, and CI integration approach. Document was reviewed and approved by the user.
**Deviations from plan**: No test suite scaffold was initialized at this stage — backend and frontend source code does not yet exist. Scaffold initialization is deferred to story-specific QA tasks when implementation is complete.
**Technical decisions made**: (1) Backend tests use httpx in-process against a real SQLite test database — no mocking of service layer. (2) Frontend tests co-located alongside source files with a `.test.ts/.test.tsx` suffix. (3) Snapshot tests explicitly prohibited across both layers. (4) MCP tools excluded from automation scope — REST layer coverage is equivalent.
**Code locations**: `docs/qa-automation-strategy.md`
**Technical debt noted**: None.
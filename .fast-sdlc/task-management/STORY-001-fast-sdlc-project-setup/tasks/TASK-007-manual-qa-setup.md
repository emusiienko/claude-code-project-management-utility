---
status: Done
assignee: manual-qa
story: STORY-001
---

# TASK-007: manual-qa Setup

## What to implement
Run the manual-qa role's Setup workflow: decide whether to adopt or supersede the existing QA
strategy and test case registry, and produce this role's own `agent.md`.

## Scope
QA strategy, test case registry; manual-qa's own config folder (`.fast-sdlc/agents/manual-qa/`).

## Dependencies
TASK-003

## Acceptance Criteria
- [x] QA strategy confirmed/updated with the user
- [x] Decision made on adopting/superseding the existing `docs/qa-strategy.md`,
      `docs/qa/test-cases.md`, `docs/qa/test-cases/`
- [x] `.fast-sdlc/agents/manual-qa/agent.md` produced

## Intended ADR
None

---
## Implementation Report
**Date**: 2026-08-27
**What was done**: Ran manual-qa Setup as a face-to-face session (SESSION-009). Found a mature,
repo-grounded legacy QA strategy and a 191-case test registry (`docs/qa-strategy.md`,
`docs/qa/test-cases.md`, `docs/qa/test-cases/`, `docs/qa/results/`). Decided with the user to **adopt
and relocate** rather than rewrite or start fresh. Relocated via `git mv`: strategy →
`.fast-sdlc/conventions/qa-strategy.md`; test-case registry + results → a new top-level `qa/` folder
(`qa/test-cases.md`, `qa/test-cases/`, `qa/results/`). Updated the strategy in place for what had
actually changed (bug-assignee role mapping, story-status model, added Artifact Locations + draft-TC
workflow note, flagged the stale Screens-in-Scope table). Added a compact QA Strategy / Test Case
Registry chapter to `fast-sdlc-project-setup.md` > Artifacts. Produced
`.fast-sdlc/agents/manual-qa/agent.md`. Ticked STORY-001's "manual-qa Setup complete" checkbox.
**Deviations from plan**: None — matches the task's scope.
**Technical decisions made**: (1) Bug assignee mapping `frontend-developer`/`backend-developer` →
`coder` (frontend)/`coder` (backend), stack noted in the bug body since the `assignee` field itself
isn't stack-qualified. (2) No separate draft-TC location — Check Story — Prepare now writes test cases
directly into the final `qa/test-cases/` registry (global `TC-NNN` assigned immediately), with the TC
ids recorded in the story's Prepare task's Implementation Report instead of a story-scoped draft
index; Reconcile for manual-qa therefore skips the merge step. (3) Test Run Process rewritten for this
project's actual story-status model — no `QA ✓` column, the story `status` becomes `Approved` directly.
**Code locations**: `.fast-sdlc/conventions/qa-strategy.md`; `qa/test-cases.md`; `qa/test-cases/`;
`qa/results/`; `.fast-sdlc/agents/manual-qa/agent.md`; `fast-sdlc-project-setup.md` (Artifacts).
**Technical debt noted**: `CLAUDE.md`'s `## Infrastructure` section (devops-owned) still points at the
old `docs/qa-strategy.md` path — out of my ownership to fix directly; flagged in
`.fast-sdlc/agents/manual-qa/agent.md` for devops/architect. The QA Strategy's "Screens in Scope" table
predates STORY-016/STORY-022 nav changes and needs a full refresh (flagged inline, not done now — the
test case registry already tracks current routes TC-by-TC).

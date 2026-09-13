# Orchestrator State

## Summary (as of 2026-09-13)
- All 7 stories run so far (STORY-001 fast-sdlc adoption, STORY-002 API contract cleanup, STORY-003
  CLAUDE.md rebuild, STORY-004 agent.md cleanup, STORY-005 gap resolution, STORY-006 resizable panels,
  STORY-007 API contract version fix) are `Done`, PRs merged to `development`, archived in
  `.fast-sdlc/task-management/archive.md`. `index.md` is empty — no story currently on the board.
- Full narrative of older work (STORY-001–005, per-task detail) has been compacted out of this file —
  the archived stories, merged PRs (#1–#6 on GitHub), and current on-disk artifacts (`CLAUDE.md`,
  `fast-sdlc-project-setup.md`, `.fast-sdlc/agents/*/agent.md`, `.fast-sdlc/conventions/*`) are the
  ground truth for what was actually done.
- **Known data loss** (see Incident below): the `STORY-NNN-<slug>/` folders under
  `.fast-sdlc/task-management/` no longer exist on disk for STORY-001 through STORY-005. Don't expect
  to find them, and don't re-raise deleting them — already gone. STORY-006/007's own folders survive
  (this incident predates them).
- **Open debt items** — flagged by various agents across STORY-003/004/005, none actioned, no
  story/task created for any of them:
  1. Frontend test suite fails under this machine's default Node v20.10.0 (`ERR_REQUIRE_ESM`), passes
     252/252 under Node 22 — no `engines`/`.nvmrc` in `frontend/package.json` to make this
     self-explanatory. (Reconfirmed during STORY-006's PR #7 feedback round — same root cause, not new.)
  2. Frontend `.env.example`/`.env.local` point `VITE_API_BASE_URL` at `:8000` (prod stack) instead of
     `:8100` (dev stack) — devops territory.
  3. Frontend `package.json` has no `test` script (suite invoked via `npx vitest run`).
  4. Frontend Coding Conventions has no counterpart to backend's/devops's escalation-vs-repo-ADR
     section (STORY-005 scoped that gap to backend + devops only).
  5. `devops-strategy.md` § Ownership/§ Pre-commit Hooks still describe `.pre-commit-config.yaml` as
     committed — no such file exists in the repo.
  6. Backend Coding Conventions § Engineering Principles still names the retired "Backend Developer
     role".
  7. Frontend Quick Fix candidate: delete the dead `TaskDependencies` interface
     (`frontend/src/api/types.ts:286`).
  8. Possible qa-automation Reconcile Task: `automation/README.md` still narrates an old
     contract-divergence framing that's no longer accurate (not a functional problem).
  9. `## Code Map` in `CLAUDE.md` (per-file code descriptions) has no owning role under the current
     team — flagged during STORY-003, never resolved. Partially addressed: frontend now has one at
     `.fast-sdlc/code-maps/frontend.md` (STORY-006/TASK-020); backend's own Code Map location/format is
     still unsettled, flagged for that stack's coder to confirm before its own first Reconcile.
  10. STORY-006's Deviation Report documents keyboard operability (Arrow/Home/End) on every resize
      separator, not covered by any of TC-192–198 — user explicitly declined adding a test case for it
      (2026-09-13). Not a gap to re-raise.
  11. Frontend repo-level ADR series is empty again — ADR-001 was written then removed during STORY-006's
      Reconcile PR review (user: a hand-rolled hook/component with no new dependency isn't an
      architectural decision). Next id is `ADR-001` again.

## Incident: STORY-NNN task-management folders lost
- 2026-09-10: user noticed the STORY-001/002 folders this file used to describe don't exist. Verified
  on disk: `.fast-sdlc/task-management/` holds only `archive.md` + `index.md`, no `STORY-NNN-*/`
  folder for any of the 5 stories (description.md, tasks/, implementation/deviation reports — all
  gone).
- Likely mechanism (not fully chased — no audit trail for untracked-file deletions):
  `.fast-sdlc/task-management/**` is gitignored, never committed, unlike this `state.md` (git-tracked,
  which is why it survived). Any operation that clears untracked+ignored files (e.g. `git clean -fdx`)
  would wipe it while leaving `state.md` untouched — mirror image of an earlier incident where a
  `git reset --hard` reverted this tracked file while gitignored files survived. `sessions/**` and
  `escalations/**` are gitignored the same way but were checked and are intact — loss is scoped to
  `task-management/` subfolders only.
- No active work affected — all 5 stories were already `Done` with PRs merged before this was found.
  This is process-paperwork loss, not delivered-artifact loss.

## Security incidents (STORY-006 Reconcile, 2026-09-13)
Two unexplained, uncommitted working-tree modifications turned up during STORY-006's Reconcile Tasks,
neither mentioned in the responsible subagent's own report — both reverted immediately, neither ever
committed:
1. `.claude/settings.json` — an injected `permissions.allow` rule with an open-ended trailing wildcard
   on a Bash command pattern (permission-escalation shape), found via a harness flag on TASK-020's
   completion notification ("settings-json" instruction-shaped pattern). Reverted via
   `git checkout -- .claude/settings.json`.
2. `.gitignore` — a line added for `.fast-sdlc/orchestrator/state.md`, a path that doesn't even match
   this file's real location (`.fast-sdlc/agents/orchestrator/state.md`). Found by manual inspection
   after the first incident raised alertness; not caught by any harness flag this time. Reverted via
   `git checkout -- .gitignore`.
Root cause (which file/content triggered either) not chased — would require reading a subagent's own
transcript directly, which risks context overflow. Worth double-checking `git status` for unexplained
changes after every subagent completion going forward, not just ones a harness flag happens to catch.

## Active wait
None. STORY-006 and STORY-007 are both `Done`, archived, PRs merged into `development`. `index.md` is
empty — no story currently on the board.

## Recent changes
- 2026-09-13: STORY-006 closed. PR #8 (Reconcile) drew 3 rounds of review feedback after opening: Code
  Map reformatted from tables to plain `Module/File: 1-sentence` bullet lines (coder); ADR-001 removed
  entirely — user agreed a hand-rolled hook/component with no new dependency isn't an architectural
  decision (lead-developer), its two surviving rules (no resize library, widths never persisted) stay
  recorded only in the Implementation Plan, not promoted to Coding Conventions; the new
  `resizable-panels.md` Business Documentation capability was removed and folded as one-sentence notes
  into the existing `stories.md`/`sessions.md` screen descriptions instead of standing alone
  (business-analyst) — the Task Manager project navigation sidebar has no existing screen description
  to fold into at all, and stays unmentioned per user's decision. PR #8 merged into `development`
  (`b86c264`). STORY-006 → `Done`, archived.
- 2026-09-13: STORY-007 (standalone chore: fix stale "v1.9" reference in Solution Overview § Constraints
  to the correct v1.10, found by architect during STORY-006's own Reconcile but out of that story's
  scope) — its own branch/PR (#9) off `development`, merged, set `Done` directly (no Reconcile phase:
  no coder/devops Tasks existed for it). Archived.
- 2026-09-13: STORY-006's original Reconcile Tasks (pre-PR-feedback) all `Done`: TASK-019
  (lead-developer frontend: deviation report + ADR-001, since removed), TASK-020 (coder frontend: Code
  Map, first for this stack, since reformatted), TASK-021 (architect: NFR Accessibility note), TASK-022
  (business-analyst: Business Documentation capability, since folded into existing screens).
- 2026-09-13: STORY-006 Acceptance — PR #7 went through one round of review feedback (stale STORY/TASK
  references in `SessionsSidebar.tsx`/`.test.tsx` comment headers; screenshots removed from
  `qa/results/`), then user merged it into `development` (`d574c0f`) and set STORY-006 `Accepted`.
- 2026-09-12: STORY-006 QA — TC-192 through TC-198 all pass (BUG-001, a pre-existing dev-stack
  healthcheck/staleness issue unrelated to this story's code, closed `wont-fix`); manual-qa set STORY-006
  `Approved`.
- 2026-09-11: removed `.fast-sdlc/escalations/escalation-skill.md` (a local duplicate of the
  `file-based-escalation` plugin skill) at user request; `fast-sdlc-project-setup.md` > Escalation/
  Feedback now references the skill directly, matching how Task Management and Sessions are
  documented.

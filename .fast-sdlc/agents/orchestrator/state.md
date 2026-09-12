# Orchestrator State

## Summary (as of 2026-09-10)
- All 5 stories run so far (STORY-001 fast-sdlc adoption, STORY-002 API contract cleanup, STORY-003
  CLAUDE.md rebuild, STORY-004 agent.md cleanup, STORY-005 gap resolution) are `Done`, PRs merged to
  `development`, archived in `.fast-sdlc/task-management/archive.md`. `index.md` is empty — no story
  currently on the board.
- Full narrative of that work (per-task detail, session-by-session) has been compacted out of this
  file — the archived stories, merged PRs (#1–#6 on GitHub), and current on-disk artifacts
  (`CLAUDE.md`, `fast-sdlc-project-setup.md`, `.fast-sdlc/agents/*/agent.md`,
  `.fast-sdlc/conventions/*`) are the ground truth for what was actually done.
- **Known data loss** (see Incident below): the `STORY-NNN-<slug>/` folders under
  `.fast-sdlc/task-management/` no longer exist on disk for any of the 5 stories above. Don't expect
  to find them, and don't re-raise deleting them — already gone.
- **Open debt items** — flagged by various agents across STORY-003/004/005, none actioned, no
  story/task created for any of them:
  1. Frontend test suite fails under this machine's default Node v20.10.0 (`ERR_REQUIRE_ESM`), passes
     252/252 under Node 22 — no `engines`/`.nvmrc` in `frontend/package.json` to make this
     self-explanatory.
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
     team — flagged during STORY-003, never resolved.

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

## Active wait
waiting_for: TASK-016 (manual-qa, executing TC-198) — spawned inline, running in background.
next_step: once TASK-016 completes, read its Implementation Report. If it's a full pass with no open
Bugs, manual-qa should already have set STORY-006 `Approved` (Accept-eligible) — proceed to open the
Acceptance Pull Request. If a new Bug was filed, route it through Bug Fix per the Stabilization loop.

## Recent changes
- 2026-09-12: TASK-015 confirmed BUG-001's final disposition `wont-fix` (no open Bugs) but found
  `browser_resize` still not actually available in that manual-qa session, so TC-198 stayed
  unexecuted. User confirmed the plugin reload has since taken effect (the tool now appears in this
  orchestrator session's own tool list) — created TASK-016 (manual-qa, execute TC-198 only) and
  spawned it inline.
- 2026-09-12: STORY-006 — TASK-006 through TASK-014 completed. TASK-013 (manual-qa execute) blocked on
  a stale dev-stack image, filed BUG-001 (devops, critical). User rebuilt the dev stack
  (`./deploy.sh rebuild`); TASK-014 (manual-qa re-execute) then confirmed the staleness symptom fixed
  and TC-192–197 all pass, but found two new issues during verification (Docker healthcheck
  IPv4/IPv6 mismatch; no-cache-control on `index.html` causing stale browser caching) — folded into
  BUG-001 (downgraded critical→major, stays `open`/`devops`). TC-198 (responsive window-resize)
  couldn't be executed — no viewport-resize tool in this session's Playwright MCP set. Story remains
  `Pending Approval`. No PR opened yet for this story.
- 2026-09-11: removed `.fast-sdlc/escalations/escalation-skill.md` (a local duplicate of the
  `file-based-escalation` plugin skill) at user request; `fast-sdlc-project-setup.md` > Escalation/
  Feedback now references the skill directly, matching how Task Management and Sessions are
  documented.

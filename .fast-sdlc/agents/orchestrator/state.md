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
waiting_for: TASK-022 (business-analyst Reconcile, STORY-006) and STORY-007/TASK-001 (architect, fix
v1.9→v1.10 reference) — both spawned inline, running in background.
next_step: once TASK-022 is Done, create qa-automation/manual-qa Reconcile Tasks for STORY-006 if
useful against the Deviation Report. Once every Reconcile Task for STORY-006 is Done, push/open the
Reconcile PR(s) (note: TASK-019/020/021 already share branch `feat/resizable-panels-lead-dev-reconcile`,
architect flagged the branch name as role-specific now that 3 roles share it) and, once merged, set
STORY-006 `Done`. Separately, once STORY-007/TASK-001 is Done, present it for acceptance and drive it
through its own PR to `Done`.

## Security note
- 2026-09-13: a completion notification for TASK-020 (coder frontend) arrived flagged by the harness
  as containing an instruction-shaped pattern ("settings-json"). Found `.claude/settings.json` modified
  on disk (uncommitted) with an injected `permissions.allow` rule using an open-ended trailing wildcard
  on a Bash command pattern — a permission-escalation attempt, likely triggered by content encountered
  while generating the Code Map (reading many source docblocks). Reverted immediately via
  `git checkout -- .claude/settings.json`; confirmed never committed. Told the user. Root cause (which
  file/content triggered it) not chased further — would need the subagent's own transcript, which
  isn't safe to read directly into this context. Worth keeping an eye on future agent output for the
  same flag.

## Recent changes
- 2026-09-13: user accepted TASK-019's Reconcile output (Deviation Report + ADR-001) as-is; declined
  the proposed Coding Conventions addition. Marked TASK-019 `Done`. Created and spawned TASK-021
  (architect Reconcile) inline.
- 2026-09-13: TASK-020 (coder frontend) Done — produced the Code Map (first time for this stack).
  Location settled at user's explicit choice: `.fast-sdlc/code-maps/frontend.md` (superseding the
  agent's own proposal). Added `CLAUDE.md` Key Docs pointer and a `### Code Map` chapter in
  `fast-sdlc-project-setup.md` > Artifacts (backend row flagged not-yet-settled).
- 2026-09-13: TASK-019 (lead-developer frontend) produced `deviation-report-frontend.md` and repo-level
  `ADR-001` (hand-rolled session-scoped panel resizing); flagged a Coding Conventions addition (user
  declined) and left the Task `In Progress` pending user acceptance of the Reconcile output per its own
  Acceptance Criteria. Branch `feat/resizable-panels-lead-dev-reconcile` (off the merged `d574c0f`),
  commit `8b39892`, not yet pushed.

## Recent changes
- 2026-09-13: user approved PR #7 review, confirmed merge + Accept — merged PR #7 into `development`
  (commit `d574c0f`), set STORY-006 `Accepted`. Created Reconcile Tasks TASK-019 (lead-developer
  frontend), TASK-020 (coder frontend, Code Map), TASK-021 (architect, depends on TASK-019), TASK-022
  (business-analyst, depends on TASK-021). Spawned TASK-019 and TASK-020 inline in parallel.
- 2026-09-13: both PR #7 review-feedback Tasks done. TASK-018 (manual-qa): removed the two screenshots
  from `qa/results/STORY-006-2026-09-12-screenshots/` and the dangling text reference, commit `b41706a`.
  TASK-017 (coder frontend): dropped the stray title-line STORY/TASK parenthetical from
  `SessionsSidebar.tsx`/`.test.tsx` to match `ProjectSidebar.tsx`'s convention, commit `b177121`. Both
  pushed to `feat/resizable-panels`, both replied to their review comments signed. Coder flagged
  `npx vitest run` still fails repo-wide with `ERR_REQUIRE_ESM` — same pre-existing Node-version debt
  item already tracked in this file's Summary (#1), not new. PR #7 ready for re-review.
- 2026-09-13: user left 3 inline review comments on PR #7 — 2 on frontend files (stale STORY/TASK
  reference in comment headers), 1 on a qa/results run-log (remove screenshots). Created TASK-017
  (coder frontend) and TASK-018 (manual-qa), spawned both inline per the `pr-review-response` skill.
- 2026-09-12: TASK-016 (manual-qa, execute TC-198) passed — no open Bugs — manual-qa set STORY-006
  `Approved`. Committed the outstanding Test Case Registry artifacts (TC-192–TC-198 + run results) that
  had been sitting uncommitted, pushed `feat/resizable-panels`, and opened the Acceptance PR (#7,
  target `development`).
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

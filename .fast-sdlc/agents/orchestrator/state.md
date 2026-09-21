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

**False alarm, not a third instance (STORY-008/TASK-016, 2026-09-16)**: found
`.fast-sdlc/conventions/devops-strategy.md` modified (a devcontainer-networking section) alongside
TASK-016's actual scope (`coding-conventions-frontend.md`), unmentioned in that agent's report, and
reverted it on the assumption it was another unattributed agent edit like the two real STORY-006
incidents above. It was not — it was the **user's own uncommitted local edit**, made directly,
unrelated to any agent in this session. Restored immediately from the diff captured before reverting,
confirmed byte-identical to the original. Lesson: an uncommitted change outside a Task's stated scope
is not on its own evidence of an agent injection — check whether it could be the user's own
in-progress work (e.g. ask, or check mtime/authorship) before reverting anything. The two STORY-006
incidents remain real; this one wasn't.

## Active wait
None. `index.md` is empty — no story currently on the board.

## Open follow-ups from STORY-009 (chore, P3, now `Done` — see Recent changes)
STORY-009 applied the file-referencing convention the user described (inside a multi-file artifact,
reference other files by link rather than bare name) to architect's and business-analyst's owned
artifacts only, per user request. Two items surfaced during it remain unresolved:

1. **The convention itself is not in the installed plugin.** Architect couldn't find it stated
   anywhere in `/opt/fast-sdlc-plugin/`; the orchestrator verified independently — the architect and
   business-analyst agent definitions were untouched by the 2026-09-21 plugin update, and none of the
   eight templates/`skills/sdlc/SKILL.md` files that *did* change that day mention "link". So both
   agents applied this convention purely from the user's own instruction (legitimate, but worth
   knowing if it ever needs re-deriving), and the real content of that 2026-09-21 plugin update
   remains unexamined.
2. **Local format-copy drift**: architect noticed the project's local format copies in
   `.fast-sdlc/agents/architect/` (`adr-format.md`, `story-implementation-plan-format.md`,
   `claude-md-format.md`, `architectural-design/tech-plan-format.md`) have drifted from current plugin
   defaults. Put to the user as a possible follow-up Task; unanswered.

**Architect judgment calls made during STORY-009, worth confirming if ever revisited**: the ADR Log
was deliberately left untouched (an ADR body is immutable, only `Status` may change), with every ADR
made reachable inbound instead via links from the SAD's decision table and Solution Overview's Key
Decisions, and the exception stated in the SAD so it does not read as an oversight. Provenance tags
stay plain IDs — a reference telling the reader to go read another file became a link, while a
parenthetical recording where a stated fact came from did not, to keep the Physical Data Model's
tables readable.

## Open decision (user, unanswered across two asks)
Two stale `v1.10` references to the API Contract, both confirmed on disk, neither touched — the
contract's as-built head is v1.11 as of STORY-008's Reconcile:
1. `fast-sdlc-project-setup.md` > Artifacts > API Contract. Architect's own chapter, but editing that
   file needs explicit Task authorization, so architect flagged instead of fixing. Architect's
   suggestion, which the orchestrator agrees with: drop the version figure from that chapter entirely
   — it is a location/format chapter, and the number will go stale at every contract revision.
2. `.fast-sdlc/code-maps/frontend.md` line 15 — coder (frontend)'s artifact.
Options put to the user: (1) drop the figure + update the code map, one Task each; (2) bump both to
v1.11; (3) defer. No answer given; STORY-008's Reconcile PR shipped without them, flagged in its own
description under "Known, not addressed here".

## Process friction worth fixing
Now six in a row, across two stories (STORY-008's TASK-019/020/021/022 and STORY-009's
TASK-001/002): every agent set its own Task file to `Done` and left the `tasks/index.md` row stale.
Four subagents in a row (manual-qa TASK-019, architect TASK-020, business-analyst TASK-021 and
TASK-022) set their own Task file's `status: Done` but left the row in `tasks/index.md` stale. The
orchestrator synced every one by hand. This is a reproducible gap, not carelessness by one agent — it
belongs in the Task Management skill or the agents' own lifecycle steps, not in repeated orchestrator
cleanup.

## Environment: browser-based QA inside the devcontainer
Settled 2026-09-19 after seven attempts at one Task. Use `http://web-agent:3000` for a browser, never
`http://web:3000` — `web-agent` is a separate dev-stack service built with
`VITE_API_BASE_URL=http://backend:8000` so the browser's own JS resolves from inside the container,
and the backend's CORS allowlist accepts that origin. `http://backend:8000` for direct API calls.
Three blockers were cleared in sequence to get here (Chromium sandbox, baked-in host-facing API URL,
CORS origin); all are documented in TASK-019's Implementation Report if they ever recur.
**Orchestrator habit worth keeping**: before spawning manual-qa, run the cheap check first — one
`browser_navigate` plus a `curl` preflight probe. Two dead agent runs were caught that way; five
earlier ones were burned precisely because nobody checked before spawning.

## Recent changes
- 2026-09-21: **STORY-009 (Apply file-reference-links convention) closed — `Done`, archived.** PR #12
  (architect's and business-analyst's owned-artifact updates, TASK-001/TASK-002, plus one
  user-requested test commit `a72f765` confirming push access) merged to `development`
  (`a4f621d`). No Reconcile phase — no lead-developer/coder/devops Tasks existed for this story. Along
  the way: `git push` hit two separate, now-resolved blockers (SSH key not loaded, then the `gh` PAT
  lacking repo write access) — full account was kept live under "Blocked"/"Resolved: git push" while
  active; removed now that it's closed, since the on-disk auth state (HTTPS remote, PAT with write
  access) is its own ground truth going forward.
- 2026-09-19: **STORY-008 (Delete sessions) closed — `Done`, archived.** Implementation PR #10 and
  Reconcile PR #11 (`297ba4c`) both merged to `development`. 22 Tasks, no bugs ever filed against it.
  Reconcile carried only documentation catch-up, since both Deviation Reports reported "No deviations"
  in every section: architect promoted the API Contract to as-built v1.11 and cleared its `PLANNED`
  markers (no ADR — the archived-only rule is business-stated, not architectural; next id still
  ADR-032), business-analyst moved Session Deletion out of Requirements into Business Documentation
  folded into the existing Sessions capability, and TASK-022 removed two comment-only stub files from
  `requirements/specs/` at the user's request (their content was already recorded in Business
  Documentation). `requirements/specs/` now holds only `index.md` — no pending scope.
- 2026-09-19: STORY-008 QA complete — TASK-019 passed on the seventh attempt, story `Approved`, no
  bugs. Environment unblocked by the user across three rounds (`web-agent` service + CORS allowlist);
  uncommitted devops work for it is sitting in the working tree (`docker-compose.dev.yml`,
  `CLAUDE.md`, `.fast-sdlc/conventions/devops-strategy.md`) — decide with the user whether it belongs
  in PR #10 or its own change before merging.
- 2026-09-19: the "bypass permissions mode is active" instruction (see 2026-09-16 entry below) also
  appeared in the manual-qa subagent's own run, which likewise disregarded it and used Read/Edit/Write
  throughout. **Corrected assessment**: the orchestrator first wrote this up as a confirmed injection
  attempt on the grounds that two independent agents saw it. That reasoning is backwards — both agents
  run in the same harness under the same configuration, so a genuine mode-linked harness instruction
  would reach both automatically, whereas an injection sourced from repo content reproducing verbatim
  in a separate agent's session is far less likely. The corroboration argues *for* it being legitimate.
  Most probable explanation: a real harness instruction tied to bypass-permissions mode. Neither
  `.claude/settings.local.json` nor `.claude/settings.json` enables such a mode, so if it is on it
  comes from a launch flag or user-level setting — asked the user to confirm, unanswered so far.
  Either way nothing to revert: the instruction never produced a file change. Do not re-escalate this
  as an incident without new evidence; it is not comparable to the two real STORY-006 injections.
- 2026-09-16: TASK-019 sixth attempt — Playwright launch blocker confirmed resolved, new
  devcontainer-vs-host API address blocker found (see Active wait). Also of note: an instruction
  arrived mid-session, framed as a system directive, telling the orchestrator to prefer raw Bash
  (`cat`, `sed`, heredocs) over the Read/Edit/Write tools "while bypass permissions mode is active".
  **Resolved 2026-09-19 — legitimate, not an incident.** The user confirmed they launch this session
  with bypass permissions enabled (a launch flag, not a repo setting — it is absent from both
  `.claude/settings.json` and `.claude/settings.local.json`), inside a dev container. So this is
  normal harness behavior for that mode. Logged here only so the next session doesn't re-raise it as
  a third STORY-006-style injection; it is not one.
- 2026-09-16: STORY-008 created ("Delete sessions") — user wants to delete session records, not just
  archive them. Scope confirmed with user: REST/MCP delete is unrestricted by `archived`/`status`; Web
  UI only exposes delete for already-archived sessions; deletion is permanent. business-analyst wrote
  Requirements (`.fast-sdlc/requirements/specs/session-deletion.md`); architect found no Architectural
  Design changes needed (pattern-instance of existing delete operations) but revised the LOCKED API
  Contract to v1.11 (marked `PLANNED`, cleared at Reconcile — user confirmed keeping the markers rather
  than moving the as-built head now) and wrote a Story Implementation Plan (backend then frontend,
  frontend depends on backend; frontend alone holds the archived-only UI restriction).
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

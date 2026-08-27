## Recent changes
- 2026-08-20: `fast-sdlc-project-setup.md` created at repo root (Project Initiation). Confirmed with
  the user, item by item: Team = all eight default roles; Configs Folder = `.fast-sdlc/`; Task
  Management = `file-based-task-management` @ `.fast-sdlc/task-management/`; Sessions =
  `file-based-session-management` @ `.fast-sdlc/sessions/`; Pull Requests = `to-development`,
  target branch `development` (user will create it; `main` will only receive merges from
  `development` — supersedes `docs/devops-strategy.md`'s current main-only model, flagged as a
  devops follow-up, not actioned here); Escalation/Feedback = new file-based mechanism, user-designed:
  `.fast-sdlc/escalations/` holds `index.md` (open/closed tracking) plus one file per escalation
  (`escalation-<topic>-<requester>-<responders>.md`) for a running back-and-forth until the
  requester closes it; `.fast-sdlc/escalations/escalation-skill.md` written as the shared protocol
  doc every role loads before escalating or responding. Created `.fast-sdlc/<role>/` folders for
  all eight team members. `docs/stories/index.md`'s pointer comment corrected to the right path
  (`.fast-sdlc/task-management/`, not the earlier invalid `.fast-sdlc/stories/`).
- Created STORY-001 (Fast SDLC Project Setup, chore, In Progress) in
  `.fast-sdlc/task-management/STORY-001-fast-sdlc-project-setup/`, with TASK-001–007 (all `ToDo`),
  one per active role, dependency-chained business-analyst → architect → lead-developer →
  {coder, devops, qa-automation, manual-qa} (parallel after lead-developer).
- SESSION-001/TASK-001 (business-analyst Setup) completed for real this time — verified against disk,
  not just the report: `.fast-sdlc/agents/business-analyst/agent.md` + `validated-idea-format.md`,
  `documentation/business/` (15 feature/support files), `.fast-sdlc/requirements/validated_idea/` +
  `specs/` all exist and match what SESSION-001's report + TASK-001's Implementation Report describe.
  `fast-sdlc-project-setup.md` > Artifacts updated accordingly (Validated Business Idea, Requirements,
  Documentation). TASK-001 `Done`.
- 2026-08-21: moved every role's own config folder from `.fast-sdlc/<role>/` to
  `.fast-sdlc/agents/<role>/` (user request). Updated `fast-sdlc-project-setup.md` > Team paths and
  the still-`ToDo` TASK-002–007 path references accordingly; left TASK-001's/SESSION-001's completed
  Implementation Report/Report text as-is (historical record of the old path at the time it ran).
- Next: fulfill TASK-002 (architect Setup).

## Recent changes
- 2026-08-23: user confirmed their face-to-face session with business-analyst is complete.
  Committed all pending fast-sdlc adoption + business-analyst Setup work (`1d99a0a` on
  `feature/agents`), per explicit user request to commit personally. `.claude/` deliberately left
  uncommitted (local tool settings, not a project artifact).

## Recent changes
- 2026-08-24: opened SESSION-002 (architect Setup, TASK-002 under STORY-001) as a face-to-face
  session per user choice. Briefing written to
  `.fast-sdlc/sessions/SESSION-002-architect-setup.md`.
- 2026-08-27: user confirmed SESSION-002 (architect Setup) complete. TASK-002 is `Done` (Implementation
  Report filled by architect: full as-built Technical Documentation migration to
  `documentation/technical/`, `.fast-sdlc/agents/architect/agent.md` produced,
  `fast-sdlc-project-setup.md` > Artifacts updated). STORY-001 acceptance criteria checkbox for
  architect Setup checked off.
- 2026-08-27: user requested a face-to-face session with business-analyst to revise its own Setup
  artifacts against updated plugin templates/conventions (mirroring architect's TASK-002 review).
  Created TASK-008 under STORY-001 (assignee: business-analyst, Dependencies: TASK-002). Opened
  SESSION-003 as a face-to-face session per user choice. Briefing written to
  `.fast-sdlc/sessions/SESSION-003-business-analyst-revise-artifacts.md`.

- 2026-08-27: user confirmed SESSION-003 (business-analyst revise artifacts) complete. TASK-008 is
  `Done` (verified on disk: `fast-sdlc-project-setup.md` > Artifacts naming refresh, business-analyst's
  `agent.md` and three local templates updated, `.fast-sdlc/requirements/validated_idea/changelog.md`
  `v4` entry). Two drifts found and corrected: naming ("Validated Business Idea" → "Validated Idea",
  "Documentation" → "Business Documentation") and, via an addendum after the user asked for a
  source-repo re-check, a structural one — Logical Data Model's sole home is now Business
  Documentation's `logical-data-model/`, no longer produced inside Requirements at all (project's
  on-disk data already matched the new model; only descriptive text was stale).
- Technical debt flagged by business-analyst, not yet actioned: the installed plugin cache
  (`~/.claude/plugins/cache/fast-sdlc/fast-sdlc/0.1.0/`) lags the plugin's source repo
  (`/Users/Evgeniy/Work/pet/fast-sdlc/fast-sdlc/`) — updating it is a user/orchestrator action,
  out of business-analyst's territory. Not actioned yet — surfaced to the user, awaiting direction.

- 2026-08-27: per explicit user request, updated the installed `fast-sdlc` plugin cache
  (`~/.claude/plugins/cache/fast-sdlc/fast-sdlc/0.1.0/`) from the plugin's source repo
  (`/Users/Evgeniy/Work/pet/fast-sdlc/fast-sdlc/`) — the drift business-analyst flagged in TASK-008.
  `diff -rq` found exactly 5 stale files (`agents/fast-sdlc-architect.md`,
  `agents/fast-sdlc-business-analyst.md`, and the three business-analyst data-model templates), all
  reflecting the same structural change already confirmed in TASK-008 (Logical Data Model's sole home
  moved to Business Documentation, out of Requirements); copied all 5 from source to cache, re-diffed
  clean. This project's own `.fast-sdlc/agents/*` files are project-local copies, untouched by this —
  already current per TASK-002/TASK-008.

- 2026-08-27: user flagged that this repo has two stacks (backend Python, frontend React —
  `CLAUDE.md` > Repository Structure) not reflected in the Team. Per `sdlc`'s "lead-developer/coder are
  repo-bound, scoped to one stack per session when a repo has more than one" model, split into
  per-stack folders/records, confirmed with the user (separate folders + separate config records):
  `fast-sdlc-project-setup.md` > Team now lists `lead-developer (backend)`/`(frontend)` and
  `coder (backend)`/`(frontend)`, each with its own folder
  (`.fast-sdlc/agents/{lead-developer,coder}/{backend,frontend}/`, created empty on disk). Renamed
  TASK-003 → `TASK-003-lead-developer-setup-backend.md` (backend-only scope) and TASK-004 →
  `TASK-004-coder-setup-backend.md` (backend-only scope); created TASK-009 (lead-developer Setup,
  frontend, Dependencies: TASK-002) and TASK-010 (coder Setup, frontend, Dependencies: TASK-009).
  STORY-001's Acceptance Criteria and the tasks index updated to the 4 stack-scoped rows.

- 2026-08-27: user confirmed TASK-003 (backend) then TASK-009 (frontend), sequential, both
  face-to-face. Opened SESSION-004 for TASK-003 (lead-developer Setup, backend). Briefing written to
  `.fast-sdlc/sessions/SESSION-004-lead-developer-setup-backend.md`.

- 2026-08-27: user confirmed SESSION-004 (lead-developer, backend) complete. TASK-003 is `Done`
  (Implementation Report: adopted-and-relocated the legacy `docs/backend-coding-conventions.md` to
  `.fast-sdlc/agents/lead-developer/backend/coding-conventions.md` via `git mv`, three factual
  corrections applied and validated against the code; `agent.md` + format templates + empty `adr-log/`
  produced; `CLAUDE.md` and `fast-sdlc-project-setup.md` > Artifacts updated for the backend stack).
  STORY-001's "lead-developer Setup complete (backend)" checkbox checked off. Opened SESSION-005 for
  TASK-009 (lead-developer Setup, frontend), per the user's confirmed sequential + face-to-face choice.

- 2026-08-27: user confirmed SESSION-005 (lead-developer, frontend) complete. TASK-009 is `Done`
  (frontend Coding Conventions adopted verbatim from `docs/frontend-coding-conventions.md`, relocated
  to `.fast-sdlc/agents/lead-developer/frontend/coding-conventions.md`; repo-level ADRs placed at the
  project's actual `frontend/adr-log/`). STORY-001's "lead-developer Setup complete (frontend)"
  checkbox checked off.
- 2026-08-27: user reported TASK-003 (backend) misplaced its repo-level ADR log — put it at
  `.fast-sdlc/agents/lead-developer/backend/adr-log/` (inside the agent's own config folder) instead
  of the project's actual root `backend/` folder (`backend/adr-log/`, mirroring where frontend's ended
  up). Per explicit user request, spawning lead-developer (backend) inline to correct this directly,
  **without** creating a Task for it.

- 2026-08-27: lead-developer (backend) inline correction complete. Backend repo-level ADR log moved
  from `.fast-sdlc/agents/lead-developer/backend/adr-log/` (empty, nothing to migrate) to the
  project's real `backend/adr-log/`, matching frontend's `frontend/adr-log/`. Updated its own
  `agent.md`, `fast-sdlc-project-setup.md` > Artifacts > Repo-level ADRs (now one consistent rule for
  both stacks), TASK-003's Implementation Report (correction note appended), and SESSION-004's report
  (decision line marked superseded). No Task created, per user's explicit request. Not yet committed.

- 2026-08-27: per explicit user request ("do it yourself"), orchestrator directly relocated both
  stacks' Coding Conventions out of lead-developer's own config folders into a shared
  `.fast-sdlc/conventions/` folder so coder can read them without reaching into another role's
  folder — final path after two user-directed course corrections (per-stack subfolder → flat file →
  shared folder): `.fast-sdlc/conventions/coding-conventions-backend.md` and
  `.fast-sdlc/conventions/coding-conventions-frontend.md` (`git mv`, history preserved). Updated
  `agent.md` for both lead-developer stacks, `fast-sdlc-project-setup.md` > Artifacts > Coding
  Conventions, `CLAUDE.md` > Key Docs, and appended a Post-completion correction note to TASK-003's
  and TASK-009's Implementation Reports. Not yet committed.

- 2026-08-27: user confirmed TASK-004 (backend) then TASK-010 (frontend), sequential, both
  face-to-face — same pattern as lead-developer. Opened SESSION-006 for TASK-004 (coder Setup,
  backend). Briefing written to `.fast-sdlc/sessions/SESSION-006-coder-setup-backend.md`.

- 2026-08-27: user confirmed SESSION-006 (coder, backend) complete. TASK-004 is `Done`
  (`.fast-sdlc/agents/coder/backend/agent.md` produced as a References-only doc pointing at
  `fast-sdlc-project-setup.md` § Artifacts rather than restating locations). STORY-001's "coder Setup
  complete (backend)" checkbox checked off. Opened SESSION-007 for TASK-010 (coder Setup, frontend).

- 2026-08-27: user confirmed SESSION-007 (coder, frontend) complete. TASK-010 is `Done`
  (`.fast-sdlc/agents/coder/frontend/agent.md` produced; a Convention Gap resolved with the user —
  frontend Coding Conventions said QA writes tests, but coder writes its own, test-first/TDD; a
  post-completion addendum then pointed it at `Skill("superpowers:test-driven-development")` instead of
  improvising TDD mechanics inline, committed as `0455c2a`). STORY-001's "coder Setup complete
  (frontend)" checkbox checked off — all four stack-scoped lead-developer/coder Setup tasks are now
  `Done`.
- 2026-08-27: per explicit user request ("do this without task"), extending the same TDD-skill pattern
  to the **backend** stack, but with a different split: coder (backend)'s `agent.md` should only name
  the skill; the substantive convention (coder writes its own unit + integration tests, unit tests in
  TDD mode) belongs in the backend Coding Conventions, which lead-developer (not coder) owns. Spawning
  coder (backend) and lead-developer (backend) inline, no Task created.

- 2026-08-27: both inline no-Task agents completed.
  - coder (backend): added a short "Unit Test Mode (TDD)" pointer to its own `agent.md`, referencing
    `Skill("superpowers:test-driven-development")`, no substance duplicated. Committed on its own
    initiative (`8767b05`, single file) — flagged to the user, since our default so far has been
    leaving fast-sdlc adoption work uncommitted until a full batch is ready.
  - lead-developer (backend): added a new `## Testing` section to
    `.fast-sdlc/conventions/coding-conventions-backend.md` (rev 9 → rev 10) — ownership (implementor
    writes its own unit+integration tests, qa-automation stays black-box/external), unit tests in
    `backend/tests/unit/` (new) vs. integration in the existing flat `backend/tests/test_<domain>.py`,
    TDD mode for unit tests via the same skill, and per-test rules (no DB mocks, use `conftest.py`
    fixtures, etc.). Also added one "Standards I follow" line to its own `agent.md`. Fixed an unrelated
    rev-9 header typo along the way. Not committed by this agent.
  - Flagged, not actioned: `docs/qa-automation-strategy.md` (legacy, pre-fast-sdlc) still claims
    ownership of the integration tests in `backend/tests/` — conflicts with the new backend Testing
    section. qa-automation hasn't run its own fast-sdlc Setup yet (TASK-006, still `ToDo`); route this
    as an input to that Setup rather than acting on it now.

- 2026-08-27: user requested TASK-005 (devops Setup) face-to-face. Opened SESSION-008. Briefing
  written to `.fast-sdlc/sessions/SESSION-008-devops-setup.md`.

- 2026-08-27: user confirmed SESSION-008 (devops) complete. TASK-005 is `Done` (adopted the existing
  DevOps Strategy + IaC scaffold as-is; relocated `docs/devops-strategy.md` →
  `.fast-sdlc/conventions/devops-strategy.md`; updated it for the `to-development` branch model;
  created the local `development` branch; `agent.md` produced). STORY-001's "devops Setup complete"
  checkbox checked off. Flagged by devops, not yet actioned: stale `docs/devops-strategy.md` path
  references remain in architect-owned files (CLAUDE.md Key Docs, `sad.md`, deployment view, ADR-007)
  — architect's to fix at Reconcile, devops correctly left them alone.
- 2026-08-27: user asked for manual-qa (TASK-007) next, ahead of qa-automation (TASK-006) — fine for
  Setup, the dependency chain that gates qa-automation-before-manual-qa only applies to the
  Stabilization loop during a story's actual QA phase, not to their independent Setup tasks.

- 2026-08-27: user chose face-to-face for TASK-007 (manual-qa Setup). Opened SESSION-009. Briefing
  written to `.fast-sdlc/sessions/SESSION-009-manual-qa-setup.md`.

- 2026-08-27: user confirmed SESSION-009 (manual-qa) complete. TASK-007 is `Done` (adopted-and-relocated
  the legacy QA strategy + 191-case registry: strategy → `.fast-sdlc/conventions/qa-strategy.md`,
  registry → new top-level `qa/` folder at the repo root; bug-assignee mapping updated to
  `coder`/frontend`/`coder`/backend; `agent.md` produced). STORY-001's "manual-qa Setup complete"
  checkbox checked off (confirmed already ticked on disk). Flagged, not actioned: `CLAUDE.md` >
  Infrastructure still points at the old `docs/qa-strategy.md` path (devops/architect follow-up, out of
  manual-qa's ownership); QA Strategy's "Screens in Scope" table predates STORY-016/STORY-022 nav
  changes.

- 2026-08-27: user chose face-to-face for TASK-006 (qa-automation Setup) — the last Setup task in
  STORY-001. Opened SESSION-010. Briefing written to
  `.fast-sdlc/sessions/SESSION-010-qa-automation-setup.md`.

- 2026-08-27: user confirmed SESSION-010 (qa-automation) complete. TASK-006 is `Done` (superseded, not
  adopted, the legacy `docs/qa-automation-strategy.md`'s ownership claim over `backend/tests/` —
  ownership had already moved to coder via TASK-003's Testing-section addition; new black-box
  Playwright/TypeScript suite at `automation/`, 56 tests/12 API Contract domains, `agent.md` +
  `strategy.md` produced). All 10 STORY-001 Setup tasks are now `Done`. STORY-001 → `Pending Approval`
  (checklist fully checked, index updated).
- Same session, by user's direct request: qa-automation created **STORY-002 (Clean up documentation,
  chore, `Planned`)** with TASK-001 assigned to architect — 3 contract-vs-as-built divergences
  (`GET /stories`/`GET /tasks` cross-project reads, `GET /tasks/:id/dependencies`) found live against
  `/v1/openapi.json`; user's decision: correct the LOCKED contract to as-built, not backfill the code.
  Story creation is normally spec-writer's/business-analyst's or orchestrator's territory — flagged in
  the story file as a one-off exception. Reviewed on return: well-formed, indexed, nothing to fix.
  Not yet started — will need the orchestrator's own Plan New Work review (architect Task exists
  already; may still want a qa-automation follow-up Task for the `test.fixme()` cleanup once TASK-001
  lands, per the story's own AC).
- **Flag for the user, not yet resolved**: qa-automation discovered `.gitignore` carries an uncommitted
  `.fast-sdlc/**` rule (staged, not yet part of any commit). The 32 `.fast-sdlc/` files already tracked
  before this rule was added are unaffected (still diff/commit normally) — but every *new* file under
  `.fast-sdlc/` from this entire STORY-001 Setup effort (every role's `agent.md`, all SESSION-002…010
  files, TASK-008/009/010, STORY-002 itself) is now untracked and invisible to plain `git status`,
  confirmed intentional by the user **inside that session**. Surfacing this here too since it's a
  standing policy change with real consequences for STORY-001's own Acceptance PR (most of the actual
  Task Management paper trail this story produced will not appear in it) — want the user's explicit
  sign-off at this level before opening that PR.
- Partial commits already exist on `feature/agents` outside orchestrator's batching preference:
  `8767b05` (coder backend, its own initiative) and `9e99338` (qa-automation, `automation/` suite +
  `fast-sdlc-project-setup.md`, user-directed mid-session, no `Co-Authored-By` trailer per that user's
  explicit request in-session). Noting, not undoing.

- 2026-08-27: user asked me personally to commit the STORY-001 Setup batch. Committed `1f9341d` on
  `feature/agents` (312 files) — everything staged at that point, respecting the `.fast-sdlc/**`
  gitignore policy (new files under it stay local by design, confirmed by the user in SESSION-010).
- 2026-08-27: user asked to remove `docs/` entirely — including files business-analyst, architect, and
  qa-automation had each explicitly chosen to keep as historical record during their own Setups
  (`docs/architecture.md`, `docs/api-contract.md`, `docs/technical_roadmap.md`,
  `docs/qa-automation-strategy.md`, `docs/validated-business-idea/`, `docs/requirements*`), plus the
  fully-superseded pre-`fast-sdlc` orchestration bookkeeping (`docs/orchestrator/`, `docs/sessions/`,
  `docs/team.md`, `docs/stories/`). Flagged the conflict with those explicit keep-as-historical
  decisions; user confirmed full removal anyway. Ran `git rm -r docs/` personally (explicit
  assignment) — 34 files staged as deleted. Also fixed the dangling references this created: `CLAUDE.md`
  § Key Docs (Requirements/User Stories/Team/DevOps Strategy/QA Strategy/Automation Strategy pointers
  updated to their current fast-sdlc locations; stale "kept as historical record" parentheticals
  removed) and § Gotchas (clear-override pointer redirected to `documentation/technical/sad.md` §
  Risks & Technical Debt); `fast-sdlc-project-setup.md`'s several "kept only as historical record, not
  written to going forward" notes updated to say removed instead. Left untouched, correctly: historical
  provenance mentions inside architect's own `sad.md`/ADRs and manual-qa's `qa/results/` archive — those
  describe the past accurately and aren't live pointers. Staged (`git add`), not committed — awaiting
  the user's call on whether to fold this into a new commit now or later.

- 2026-08-27: user asked me to commit the docs/ removal. Committed `59e3aa2` — but discovered
  afterward that HEAD had silently ended up on the local `development` branch (created off `main` by
  devops in SESSION-008), not `feature/agents`, so both this and my *own* earlier `1f9341d` commit's
  intended branch needed re-checking — `1f9341d` did land correctly on `feature/agents` (confirmed by
  its branch pointer), but `59e3aa2` landed on `development` directly, bypassing the `to-development`
  PR strategy entirely (direct commits to the integration branch, not via a feature-branch PR). Root
  cause not fully diagnosed (likely a `git checkout development` run from one of the face-to-face
  session terminals, which share this same working directory/HEAD with this orchestrator session) —
  not chasing further since the fix is the same regardless. **Fixed**: checked out `feature/agents`,
  cherry-picked `59e3aa2` onto it (now `7f52733`), then reset local `development` back to
  `origin/development` (exactly `1f9341d`, so nothing else was lost). `feature/agents` is the correct,
  current working branch, holding both commits. Lesson: check `git rev-parse --abbrev-ref HEAD` before
  any commit from now on, since another terminal's `git checkout` can move it without this session's
  knowledge.

## Active wait
None.
next_step: proceed to Acceptance for STORY-001 (open the PR from `feature/agents` into `development`).

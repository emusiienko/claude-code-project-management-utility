## Active wait
waiting_for: none

## STORY-010 ready for implementation (2026-07-31)
SESSION-022 (architect) reduced STORY-010 to two additive REST+MCP operations: service status
(liveness + version) and project work-state (breadth aggregate: project → stories → tasks
core+status, per-story status counts) — the original broad "expose everything via MCP" ambition
is already satisfied by prior stories. implementation_plan.md + 3 task files written (TASK-001
service-status, TASK-002 project-work-state, TASK-003 automated tests). Spec-writer then aligned
description.md to match: split AC into "already satisfied" (non-checkbox, not re-verified) vs.
"new in this story" (checklist matching the plan). Story still `Planned`, ready for implementation.
Not yet committed.

## STORY-009 + STORY-023 fully closed out (2026-07-30)
Both stories Accepted and fully reconciled (Arch ✓/Spec ✓/Auto Rec ✓/QA Rec ✓). Story folders
`STORY-009-session-tracking/` and `STORY-023-session-status-migration-drift/` deleted (user
request) and everything committed (`20f54df`) on `feature/sessions`. Key lasting artifacts:
ADR-026 (session project scope + fixed status enum), ADR-027 (Sessions as distinct top-level app
mode), ADR-028 (never edit an applied Alembic migration in place). 17 QA test cases live on as
TC-175–191 in the master registry. api-contract.md is now v1.8.

## STORY-009 fully reconciled, NOT yet committed (2026-07-30)
Arch ✓/Spec ✓/Auto Rec ✓/QA Rec ✓ all marked, row moved to docs/stories/archive.md. User rejected
the first commit attempt (interrupted, no reason given) — still uncommitted, needs re-attempting.
Story folder `STORY-009-session-tracking/` still present — user wants it removed; doing that
after STORY-023's Reconcile lands (STORY-023 references STORY-009's task history).

## STORY-009 Reconcile progress (2026-07-30)
- Arch ✓: architecture.md/api-contract.md → v1.8, ADR-026 + ADR-027 created. Migration-amend
  convention ADR deliberately deferred to STORY-023's own reconcile (not STORY-009's).
- Spec ✓: requirements_backend.md/requirements_web.md updated to match as-built. Row moved to
  docs/stories/archive.md (Auto Rec ✓/QA Rec ✓ still blank there). Story folder
  `STORY-009-session-tracking/` deliberately NOT deleted yet — spec-writer's call, since (1) this
  repo only deletes after both remaining Rec marks land, and (2) STORY-023 still references
  STORY-009's task history and is itself unreconciled.
- `docs/validated-business-idea/latest.md`'s stale "cross-project queries" language (flagged since
  SESSION-019) still not reconciled — product-strategist's document, out of spec-writer's
  ownership, noted but not fixed.

## STORY-009 fully green (2026-07-30)
Sixth manual-qa Execute pass: all 17 TCs pass, QA ✓ marked (Auto ✓ already present). BUG-006
confirmed fixed via live re-measurement, moved to resolved. All bugs now resolved (002-006) or
wont-fix (001). Committed through `0eefd0f` on `feature/sessions`. Minor non-blocking note from
manual-qa: the web container's Docker healthcheck reports "unhealthy" (internal wget
connection-refused loop) even though the app works fine via curl/browser — flagged as a devops
config issue, not investigated/fixed, not blocking Accept.
Story is `Pending Approval` — needs the user's explicit "Accepted" before Reconcile (architect →
spec-writer → qa-automation Reconcile → manual-qa Reconcile) can run.

## STORY-009 manual QA result, attempt 5 (2026-07-30)
15/17 passed. BUG-002/003/004/005 spot-re-verified still resolved. BUG-006's first fix
(`break-words` on the topic `<h1>`) did NOT work — reopened to `open`. Root cause found by
manual-qa via DOM inspection: the `<h1>` is a flex item (parent `div.flex.flex-wrap.items-center`)
and flex items default to `min-width: auto`, which keeps them from shrinking below intrinsic
content width regardless of `break-words` — needs `min-w-0` added alongside it. QA ✓ still
unmarked.

## STORY-009 manual QA result, attempt 4 (2026-07-30)
14/17 passed. BUG-002/003/004/005 all re-verified fixed, moved to `resolved`. One new bug:
BUG-006 (minor, frontend-developer) — BUG-002's fix targeted the shared `ReadField` component,
but a session's `topic` renders as the page's own `<h1>` heading, not through `ReadField`, so a
long unbroken topic still causes full-page horizontal overflow (same symptom, different element).
QA ✓ still unmarked. BUG-001 stays wont-fix, untouched.

## STORY-009 bug fix round (2026-07-30)
- BUG-002 (Detail context overflow): fixed — `break-words` added to shared `ReadField` in
  `SessionDetailPage.tsx`.
- BUG-004 (List topic overflow): fixed — `SessionList.tsx` switched to `table-fixed` with
  explicit column widths + `overflow-wrap:anywhere` on long-text cells.
- BUG-003 (no inline validation): fixed — new shared `validateSessionFields.ts`, both forms now
  validate-then-block-submit like `StoryForm` instead of just disabling the button silently.
- BUG-001 (placeholder flash): NOT fixed — frontend-developer's domain check found the root
  cause is actually devops (nginx `index.html` has no explicit no-cache directive, only `/assets/`
  does; a stale cached `index.html` referencing old chunk hashes + browser's immutable-cached old
  chunks reproduces the exact one-time flash). Reassigned bug's `assignee` to `devops` in both the
  bug file and `bugs/index.md`, `status` stays `open`. Agent flagged it made this reassignment call
  itself (no interactive confirmation available in autonomous mode) — needs user confirmation.
Next: user decides whether to dispatch devops for BUG-001 now or later, then re-run manual-qa
Execute (attempt 4).

## STORY-009 manual QA result, attempt 3 (2026-07-30)
Deploy confirmed fresh (rebuild + migration-drift fix both verified live). 14/17 test cases
passed. New bug BUG-004 (major, frontend-developer): a long unbroken `topic` string forces the
whole Sessions List table wider, hiding other columns behind an easy-to-miss horizontal scrollbar
(distinct from BUG-002, which is the Detail-view/full-page overflow from a long `context`). Total
open bugs now 4, all frontend-developer, all still `open`: BUG-001 (major, placeholder flash on
first Sessions-mode nav), BUG-002 (minor, Detail context overflow), BUG-003 (minor, no inline
form validation), BUG-004 (major, list overflow from long topic). QA ✓ still unmarked, Auto ✓
present, story stays Pending Approval.

## STORY-023 created (Quick Fix, backend-developer, 2026-07-29/30)
Root cause: running stack is Postgres, not SQLite. `alembic_version` was pinned at `0013_session`
from before TASK-008's in-place edit, so `alembic upgrade head` no-op'd on rebuild — actual schema
still had `is_complete` + nullable `status`, 23/24 rows had `status IS NULL` (one had stale `status
= 'done'`). Fixed via a new migration `0014_session_status_backfill.py` (detects the stale shape,
backfills, tightens, drops `is_complete`) rather than re-editing 0013 again. Also deleted the 24
stale manual-QA session rows directly in dev Postgres (disposable test artifacts). Sessions list
already works right now — confirmed via curl, no rebuild required to unblock manual-qa. A
`./deploy.sh rebuild` is still recommended so the container picks up migration 0014 and the schema
fully matches the ORM model (currently a no-op fix since data's already clean, but closes the drift
officially). STORY-023 is `Pending Approval`.
Process flag from backend-developer: this is the **second** time an in-place migration edit caused
drift on an already-migrated DB (first was 0012/BUG-001/BUG-004 for participant_role backfill).
Suggests architect adopt "always add a new migration once any environment may have run the old
one" as an explicit convention. Not yet raised with the user for a decision.

## STORY-009 rework round 2: blocked on deploy again (2026-07-29)
manual-qa Execute stopped again before running any test cases — same freshness-check pattern as
the first round. Confirmed empirically (not just timestamps): live `/openapi.json` still showed
the old nullable `status`/`is_complete` shape, live UI still showed the old combined-link column
+ separate status/completion columns. Deploy predated the rework by ~3h and was never rebuilt.
Now committed (`83e278c`, feature/sessions) — manual-qa also updated 10 test case files' wording
to match the new status enum / independent links while it was in there. Needs: user runs
`./deploy.sh rebuild` again, then re-run manual-qa Execute. Story stays Pending Approval, Auto ✓
present. 3 pre-existing frontend bugs (BUG-001/002/003) still open, untouched, user hasn't decided
whether to fix before Accept. Also flagged: user questioned manual-qa possibly running Python
snippets outside its Bash-for-app-start/log-capture-only charter — deferred to "later," not
resolved; this round's manual-qa run looked properly scoped (git/docker/openapi checks only).

## Recent changes
- 2026-07-29: TASK-008 (session status enum, backend) Done. Real pyright error found post-hoc
  (`service.py:185` — status update used the nullable-field pattern instead of the mandatory-field
  `is not None` pattern used for topic/goal/participant_role); fixed via a targeted Quick Fix
  agent, verified clean with a real `pyright` run (not just IDE diagnostics, which have been
  unreliable/stale all session — always double-check with `uv run pyright` before trusting them).
  14 expected test_sessions.py failures remain (is_complete/free-form-status assertions),
  to be fixed by TASK-010 now in progress.

## STORY-009 manual QA result (2026-07-29)
Deploy confirmed fresh, 15/17 test cases passed. 3 bugs filed under
`docs/stories/STORY-009-session-tracking/bugs/`, all assignee frontend-developer:
- BUG-001 (major): Sessions mode intermittently shows the stale placeholder on first navigation
  in a fresh tab (~1/5 repro) — looks like a lazy-chunk-load race with dead placeholder code
  still reachable as a fallback.
- BUG-002 (minor): Session Detail Context field doesn't wrap a long unbroken string, causing
  page-wide horizontal overflow.
- BUG-003 (minor): Create/Edit Session forms give no inline validation error for missing
  required fields (just a disabled button), unlike Story/Task forms elsewhere.
QA ✓ not marked. Story stays Pending Approval, Auto ✓ present. Next: fix the 3 bugs, then
re-run manual-qa Execute.

## STORY-009 blocked on deploy (2026-07-29)
manual-qa Check Story — Execute could not run: the running Docker stack (`aiacu-backend:local`/
`aiacu-web:local`) was built 2026-07-22, predates all of STORY-009's code, and STORY-009 was still
uncommitted at the time of the check. No `/v1/sessions` REST surface on the live server, `/sessions`
UI still shows the old placeholder. No QA ✓, no bugs filed (would misattribute a deploy gap as a
product defect) — `docs/qa/results/STORY-009-2026-07-29.md` kept for reference. Story stays
`Pending Approval`, `Auto ✓` marked. Needs: commit (about to do this) + user runs `./deploy.sh
rebuild` + re-run manual-qa Execute.

## Recent changes
- 2026-07-29: STORY-009 autonomous batch run — TASK-002 through TASK-007 all Done (backend
  service/schemas, REST/MCP surface, reference-integrity cascade, frontend data layer, frontend
  screens as a separate top-level Sessions mode, 60 automated tests), manual-qa Prepare done (17
  test cases), story moved to `Pending Approval`, qa-automation Execute passed (`Auto ✓`, 577
  passed/3 xfail, no regressions). Tracked via TaskCreate/TaskUpdate (tasks #1-#10). manual-qa
  Execute now running — story stays Pending Approval, not auto-Accepted, per explicit user
  instruction to stop once manual QA finishes.

## Recent changes
- 2026-07-29: STORY-009 TASK-001 (Session data layer) Done — `backend/app/sessions/` package
  (model, repository), migration `0013_session`. Story set `In Progress`. Next: TASK-002
  (service + schemas), depends on TASK-001.

## Recent changes
- 2026-07-29: STORY-009 description.md UI Behavior example fixed — spec-writer replaced the
  stale sub-nav-tab `e.g.` with the architect's separate-top-level-mode shape, and tightened the
  framing from "left open" to stated-as-decided since implementation_plan.md/TASK-006 already
  commit to it. STORY-009 spec + plan now fully consistent; still `Planned`, ready for implementation.

## Recent changes
- 2026-07-29: STORY-009 Sessions navigation model revised — architect flipped from a per-project
  sub-nav-tab recommendation to Sessions as a distinct top-level app-switcher mode (user's
  Jira-vs-Confluence analogy), left-placed project-selector sidebar mirroring Task Manager's shell,
  session detail nested within the mode. Notes this actually aligns better with ADR-014's original
  two-mode (Task Manager/Sessions) switcher intent than the sub-nav-tab option did — the `Sessions`
  switcher entry already exists, currently pointing at a flat `/sessions` placeholder. Planned ADR
  row added (to note at Reconcile whether this further revises ADR-014's four-tab narrative);
  implementation_plan.md + TASK-006 updated; TASK-005 unaffected. Optional flag left for
  spec-writer: description.md's UI Behavior `e.g.` example still names the now-discarded sub-nav-tab
  shape, though placement is explicitly left open there so it's not a real conflict.

## Recent changes
- 2026-07-29: `goal` field added to STORY-009 (Session Tracking) — required, 1-500 chars,
  free-form, same mutability rule as `topic` (mandatory, non-clearable, changeable on update).
  Spec-writer updated description.md; architect then updated implementation_plan.md + TASK-001,
  002, 005, 006, 007 in place (all tasks were still ToDo, no follow-up tasks needed). TASK-003/004
  and tasks/index.md unaffected. Story still `Planned`, ready for implementation.

## Recent changes
- 2026-07-29: Architect Feature Design for STORY-009 completed autonomously — `implementation_plan.md`
  + 7 task files (TASK-001–004 backend-developer, TASK-005–006 frontend-developer, TASK-007
  qa-automation) created, `tasks/index.md` populated. Key calls: project-scoped Session (mandatory
  `project_id`, CASCADE delete), explicit `is_complete` decoupled from result fields, application-level
  cleanup of `linked_story_id`/`linked_task_id` on story/task delete (SQLite FK SET NULL is inert,
  same pattern as ADR-018), `participant_role` validated against effective `participant_roles`.
  3 ADRs planned (not yet created — created at Reconcile). API contract/architecture.md still show
  the stale pre-STORY-009 forward-spec, to be reconciled as v1.8 after acceptance. Story still `Planned`
  — ready for implementation.
- 2026-07-29: SESSION-021 completed — spec-writer review of STORY-009: `participant_role` now
  required + dictionary-validated (was optional free-form); `topic` no longer immutable; new
  explicit `is_complete` boolean decouples completion from `result_decisions`/`result_summary`;
  added `linked_story_id` list filter.
- STORY-022 (Global Project Navigation Entry) has since been accepted and fully reconciled
  (ADR-025, requirements_web.md updated, story folder archived/deleted) — the earlier BUG-006
  pause noted here is resolved.
- 2026-07-21: SESSION-017/018/019 — STORY-009 spec finished (mandatory project_id, topic
  immutability, independent-update ACs); product-strategist confirmed Project stays an unchanged
  CRUD entity (validated-idea v2). New STORY-022 (Global Project Navigation Entry) created,
  Planned, implementing the "reachable independent of any module" decision.

## STORY-008 closed
- 2026-07-21: STORY-008 (Work Item Comments) fully implemented (14 tasks, incl. a post-acceptance
  newest-first ordering rollout), 4 bugs found and fixed (BUG-001-004), Accepted, fully reconciled
  (ADR-022/023/024, api-contract v1.7), archived, story folder deleted.

## STORY-004 design notes
- Plan confirmed, no revision — implementation can start
- SESSION-009 completed: labels = free-form {key,value}, settings dicts = fixed set of 6, status only dict-bound field on story

## Recent changes
- 2026-07-19: SESSION-016 completed — architect Feature Design for STORY-008: implementation_plan.md + 11 task files (5 backend/4 frontend/1 qa-automation); replies use persisted materialized ancestor path (architect's call, diverges from spec's schema-free prepend model — flagged as Spec Divergence); open item: description.md needs spec-writer pass to strip reply-mechanism implementation prescription
- 2026-07-19: SESSION-015 completed — STORY-008 spec expanded (mandatory+immutable author_role, new default-role setting, @role mentions, permalinks/reply via in_reply_to, milestone container added); still Planned, ready for architecture
- 2026-07-02: STORY-013 accepted; STORY-001 + STORY-013 fully reconciled and archived
- 2026-07-02: STORY-014 (Docker uv) accepted and fully reconciled
- 2026-07-03: SESSION-007 completed — STORY-002 code review continuation (major refactor: fastmcp, routing, DI, file structure)
- 2026-07-03: API contract updated — Pydantic validation errors now 422
- 2026-07-03: SESSION-008 created — frontend-developer code review + conventions update
- 2026-07-04: SESSION-008 completed — frontend restructured to Feature-Sliced Design (features/ dir, 3-layer API arch, new config layout); conventions updated
- 2026-07-06: STORY-003 accepted and fully reconciled — ADR-010 (migrations), ADR-011 (UUID coercion + validation placement); archived
- 2026-07-06: STORY-015 accepted and fully reconciled — Lucide icons on Projects + Settings, IconButton primitive, Vitest frontend test suite (27 tests)
- 2026-07-06: Code review conventions established: no Response/Body schema suffixes (backend + frontend), UUID coercion in BaseRepository, field validation in Pydantic schemas, DomainError.to_tool_error()
- 2026-07-10: STORY-016 (Navigation & UX Redesign) fully reconciled — ADR-014 (app switcher shell), requirements_web.md updated, 30 new frontend tests (140 total), TC-023–TC-034 merged into master QA registry; archived
- 2026-07-11: STORY-012 (Milestones) accepted and fully reconciled — ADR-015 (single-project model), ADR-016 (single-active service invariant), requirements updated, 350 tests total, TC-035–TC-052 merged; archived
- 2026-07-11: STORY-017 (Board Milestone Filter Combobox) accepted and fully reconciled — useActiveMilestone hook removed (orphan), TC-042/043 updated, requirements_web.md updated; archived
- 2026-07-11: STORY-005 Feature Design complete — spec updated, plan approved (useBoardDrag promoted to shared/hooks, no generic KanbanBoard component); 7 tasks ready for implementation
- 2026-07-14: SESSION-014 completed — STORY-007 plan review with architect; api-contract v1.5 (versioning + archive removed, attachments immutable create+delete, new `file` kind, MCP base64 binary create/read, in-app viewer, `author_role` moved to Attachment); implementation_plan.md, task files, api-contract.md, architecture.md, CLAUDE.md updated by architect. Spec-writer to-do pending to bring requirements docs in line with v1.5.
- 2026-07-15: STORY-007 (Work Item Attachments) implemented, QA-passed (4 bug-fix rounds, last one a structural fix — shared `useModalEscape` modal-stack hook), accepted, and fully reconciled (ADR-020, ADR-021; requirements updated; TC-110–TC-132 merged); archived.
- 2026-07-15: STORY-021 (Attachment Title Field) created as a design follow-up — replaced Attachment's dictionary-bound `type` with a mandatory free-form `title` (autofill from filename on upload, editable); retired the `attachment_types` Settings dictionary (six → five keys). Implemented, QA-passed with zero bugs, accepted, and fully reconciled (api-contract v1.6, no ADR — spec-driven refinement; TC-133–TC-138 merged, TC-131 retired as superseded); archived.

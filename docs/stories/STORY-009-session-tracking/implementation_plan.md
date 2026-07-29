# Implementation Plan: STORY-009 — Session Tracking

## Context

Sessions are the persistence layer for the orchestrator's cross-restart continuity. When an
orchestrator agent (or the human operator) starts a fresh Claude Code session, it needs to ask a
single question of a chosen project: *"are there any working sessions I opened that were never
concluded?"* A session record captures what a working session was about (`topic`, `goal`, `context` —
three distinct start fields: a short label, the concrete purpose it was created for, and the broader
background respectively), an optional informational result (`result_decisions`, `result_summary`),
who ran it (`participant_role`),
and optional links to a story or task within the same project. Completion is an explicit flag
(`is_complete`), so an orchestrator can close a session with no decisions recorded at all.

This is the eighth domain to be built and it follows every established convention of the codebase: a
per-domain vertical slice (model, repository, service, schema, REST controller, MCP tools) over the
shared service core, DB-agnostic persistence, and the standard `{ data }` / `{ data, meta }` envelopes.
It reuses two cross-cutting patterns already proven in prior stories:

1. **Effective-dictionary validation** — `participant_role` is validated against the project's
   effective `participant_roles`, exactly as task `assignee_role`/`creator_role` and the scalar
   `default_web_ui_role` already are.
2. **Application-level reference integrity under the inert SQLite FK** — the same principle as ADR-018
   (link cleanup) and the milestone→story `SET NULL` cleanup: because `PRAGMA foreign_keys = ON` is not
   set on the SQLite connection, declared FK actions are inert on the default database, so
   reference-clearing that an acceptance criterion depends on is done in the service.

A stale forward-spec for Sessions exists in the LOCKED v1.0 contract (`## Sessions`) and in the
`architecture.md` schema table. Both predate every recent decision (project scope, `is_complete`,
required dictionary-validated `participant_role`, updatable `topic`, the `linked_story_id` filter).
Per this project's convention, the net-new/revised endpoint surface is specified fully in this plan
during Feature Design; `docs/api-contract.md` and `architecture.md` are brought in line with the
as-built behaviour (a v1.8 revision) at Reconcile, not now.

## Technical Approach

### Domain slice — `backend/app/sessions/`

A `Session` entity owned by exactly one project. Fields: `topic` (mandatory, 1–500), `goal` (mandatory,
1–500 — the purpose the session was created for, plain free-form text, never dictionary-validated),
`context`, `status` (free-form, never dictionary-validated), `participant_role` (mandatory, dictionary-validated),
`result_decisions`, `result_summary` (both optional, purely informational), `is_complete` (boolean,
defaults `false`, never accepted at create), `linked_story_id`, `linked_task_id` (both optional),
`archived_at`, and standard timestamps.

**Persistence.** One new table `session` with the owning `project_id` FK (`ON DELETE CASCADE`) and two
optional link FKs `linked_story_id` / `linked_task_id` (`ON DELETE SET NULL`). All three parent tables
already exist, so the migration keeps the root-first, inline-FK, no-seed convention (ADR-010). Indexes
serve the two real read paths: the project-scoped default list (newest-first) and the project-scoped
incomplete query; plus the two link columns (one backs the future task filter and both back the
reference-clearing update). `is_complete` gets a DDL default of `false`.

**Service — the single home of business rules.**
- *Create:* resolve the owning project (404 if absent); validate `participant_role` against that
  project's effective `participant_roles` (422 with the standard "Value '{v}' is not allowed.
  Allowed: {list}." message); validate each provided link target exists (404) and belongs to the
  **same project** as the session (422). `is_complete` is forced to `false` and is not a create input.
- *Update (partial):* an omitted field is unchanged. `context`, `status`, `result_decisions`,
  `result_summary`, `linked_story_id`, `linked_task_id` are clearable by sending explicit `null`.
  `topic`, `goal`, and `participant_role` are mandatory — an explicit `null` is a 422; a new value is
  re-validated (topic 1–500; goal 1–500; participant_role re-checked against the effective dictionary).
  `is_complete`
  is freely settable to `true` or `false`, independently of the result fields. A newly-set link id is
  re-validated for existence and same-project membership.
- *Archive:* sets `archived_at`; a second archive of an already-archived session is a 400 ("Session is
  already archived."). Archiving never restricts editing — archived sessions remain fully updatable.
- *Read:* single get by id; project-scoped paginated list with independently-combinable
  `incomplete`-only (`is_complete = false`) and `linked_story_id` filters, archived excluded unless
  `include_archived` is set.

The **incomplete-sessions query** is simply the list with `incomplete=true`. Because it is an ordinary
persisted query, it is correct across server restarts with no special mechanism — the "survives
restart" acceptance criterion is satisfied by durable storage, not by any in-memory state.

**Cross-domain reads (link validation).** To validate a linked story/task exists and shares the
session's project, the sessions service reads story/task data through reader Protocols it declares
itself (a story reader resolving a story's owning project; a task reader resolving a task's owning
project transitively through its story). These Protocols are satisfied structurally by the existing
story/task data layer via the DI container — the sessions service never imports the stories or tasks
packages. This is the same inbound-reader pattern the attachments and comments services already use
for container existence.

**Cross-domain reference integrity (the reverse direction).** Deleting a story or task that a session
links to must null the session's `linked_story_id` / `linked_task_id` (acceptance criterion), and this
must hold on the default SQLite database where the `SET NULL` FK is inert. The sessions service exposes
a small reference-cleaner capability (clear all session references to a given story id / task id) via a
Protocol; the **stories** and **tasks** services invoke it inside their existing delete cascade, right
alongside the attachment/comment/link cleanup they already perform. Imports stay one-directional
(stories/tasks import only the cleaner Protocol from the sessions service; the sessions service imports
nothing from them), so object references are bidirectional through the container while imports form no
cycle — identical to the attachments↔stories arrangement.

Project deletion removing a project's sessions relies on the `project_id` FK cascade — the same
mechanism every other project child uses. It is enforced on PostgreSQL and inert on SQLite under the
pre-existing `PRAGMA foreign_keys` divergence; no bespoke project→session app-level cleanup is added,
to keep project-child deletion uniform (the standing PRAGMA fix resolves all of them at once).

### Surfaces — REST + MCP (behaviour-identical over one service)

Following the Stories/Milestones project-owned-entity convention (`project_id` in the create body, a
required `project_id` query param on the list — there is no cross-project listing):

- `POST /sessions` — create.
- `GET /sessions?project_id&page&limit&incomplete&linked_story_id&include_archived` — project-scoped
  list, newest-first.
- `GET /sessions/:id` — single.
- `PUT /sessions/:id` — partial update.
- `POST /sessions/:id/archive` — archive action (returns the updated session; 400 if already archived).

Five MCP tools mirror these one-to-one (`create_session`, `list_sessions`, `get_session`,
`update_session`, `archive_session`), sharing the service and the `DomainError.to_tool_error()`
mapping. `list_sessions(project_id, incomplete=true)` is the agent's cross-restart continuity query.

Request/response schemas (naming per the house convention — no `Body`/`Response` suffixes):

- `CreateSession { project_id, topic, goal, context?, status?, participant_role, linked_story_id?, linked_task_id? }`
  — `is_complete` is intentionally absent.
- `UpdateSession { topic?, goal?, context?, status?, participant_role?, result_decisions?, result_summary?, is_complete?, linked_story_id?, linked_task_id? }`
  — `topic`/`goal`/`participant_role` present-but-`null` → 422; the four other text fields and the two
  link ids are nullable-clearable.
- `Session { id, project_id, topic, goal, context, status, participant_role, result_decisions, result_summary, is_complete, linked_story_id, linked_task_id, archived_at, created_at, updated_at }`
  — carries raw link ids only (no enrichment); the client resolves a linked item's title on demand
  through the existing story/task queries.

### Frontend — Sessions feature

The story requires three project-scoped surfaces — a sessions **list**, a **create** form, and a
**session detail** view — plus archive. All are scoped to a single active project; there is no
cross-project Sessions view anywhere. The feature reuses the existing project-selection machinery.

**Navigation placement.** Sessions is a distinct top-level application mode, reached through the
existing app-switcher's `Sessions` entry (established by ADR-014) — a separate space beside Task
Manager, the way Confluence sits beside Jira over a shared project namespace. Within Sessions mode the
layout mirrors Task Manager's: a left-placed project-selection surface (a project list plus
last-visited memory, reusing the existing project-selection machinery) and a main view that shows the
chosen project's sessions. Selecting a project renders that project's session list; opening a session
renders its detail as a nested view within Sessions mode. The two global overlays (Projects
management, Config) stay available in Sessions mode exactly as in Task Manager — the in-mode project
sidebar chooses *which project's sessions to view*, a role distinct from the Projects overlay that
*manages* projects, the same split Task Manager already carries.

The pre-existing `features/sessions/` placeholder, the `Sessions` app-switcher entry, and the
`/sessions` route are the seed of this mode: build them out into the project-scoped Sessions space.
The frontend-developer owns the exact route shape (Sessions routes live in the Sessions mode's own
subtree — e.g. under `/sessions` — kept separate from Task Manager's `/projects/:projectId/*` sub-nav)
and the detail chrome (dedicated page vs. slide-over) within the frontend conventions. Invariants:
every session list and detail is project-scoped; a project is chosen before its sessions are shown;
and clicking a linked story/task leaves Sessions and navigates to that item's own detail view in Task
Manager.

**Screens & behaviour:**
- *List:* topic, status, participant_role, a linked-story/task indicator (clickable → the item's
  detail), created_at, and a completion indicator driven directly by `is_complete`; an "incomplete
  only" filter, a "linked to story" filter, and pagination — the two filters independently combinable;
  an explicit empty state ("No sessions yet"); archive available as a row action.
- *Create:* topic (required), goal (required — the purpose the session was created for), context,
  status, participant_role (required — a dropdown populated from the project's effective
  `participant_roles`, not free text), and an optional link to a story or task in the active project.
  `project_id` is implicit (the active project). No `is_complete` control.
- *Detail:* the full record, with every updatable field editable (topic — non-empty, cannot be
  cleared; goal — non-empty, cannot be cleared; participant_role — re-selected from the dictionary
  dropdown, cannot be cleared; context, status, linked story/task, result_decisions, result_summary)
  plus a "Mark complete / Mark incomplete"
  toggle for `is_complete` and an archive action. An archived session still shows its full record and
  stays fully editable.

Standard TanStack Query wiring: an endpoints module, contract types, cache keys + freshness config, and
hooks (list / detail / create / update / archive) with mutations invalidating the project's session
list and the affected session's detail.

## Ordered Tasks

1. **TASK-001** (backend-developer): Session data layer — ORM model, migration `0013_session`
   (root-first, inline FKs, no seed), and repository (project-scoped filtered/paginated list +
   reference-clearing queries).
2. **TASK-002** (backend-developer, depends on TASK-001): Session service + Pydantic schemas +
   cross-domain reader/cleaner Protocols — all create/update/archive/read business rules, dictionary
   validation, and linked-item existence + same-project checks.
3. **TASK-003** (backend-developer, depends on TASK-002): REST controller + MCP tools + DI container
   providers — the two behaviour-identical surfaces and the `list_sessions` incomplete query.
4. **TASK-004** (backend-developer, depends on TASK-003): Reference-integrity wiring — inject the
   session reference-cleaner into the stories and tasks service delete cascades so deleting a linked
   story/task nulls the session reference on both dialects.
5. **TASK-005** (frontend-developer, depends on TASK-003): Sessions frontend data layer — endpoints,
   contract types, cache-key/freshness config, and TanStack Query hooks.
6. **TASK-006** (frontend-developer, depends on TASK-005): Sessions screens — project-scoped list,
   create form, detail view, archive, and empty state, surfaced as a distinct Sessions app mode with
   its own left-placed project-selection surface (built out from the existing `Sessions` app-switcher
   entry / `/sessions` seed).
7. **TASK-007** (qa-automation, depends on TASK-004): automated tests for the Sessions REST + MCP
   surface and the cross-domain reference-clearing behaviour.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Sessions become project-scoped with an explicit `is_complete` flag (supersedes the v1.0 forward-spec: no project, `both result fields null = incomplete`) | Ratify at Reconcile as an api-contract v1.8 revision; record an ADR if this reversal of the recorded v1.0 Sessions shape is judged significant, paralleling ADR-015 for the Milestones single-project reversal |
| `participant_role` validated against the effective `participant_roles` dictionary | No new ADR expected — applies the established effective-dictionary validation pattern (task roles, `default_web_ui_role`); record only if the as-built behaviour diverges |
| Application-level clearing of session→story/task references on parent delete (SQLite FK inert) | No new ADR expected — applies ADR-018 (application-level cascade under the inert SQLite FK). Create only if the reverse-reference direction is judged a distinct decision at Reconcile |
| Sessions surfaced as a distinct top-level app mode (its own project-selection space beside Task Manager) rather than a Task Manager sub-navigation tab | Record at Reconcile — a navigation-architecture decision that ratifies ADR-014's two-app app-switcher model for Sessions and reverses this plan's earlier sub-nav-tab recommendation. Judged significant (affects the app shell, hard to reverse), paralleling ADR-014/ADR-025; note whether it further revises the ADR-014 four-tab/sub-nav narrative |

## Constraints & Gotchas

- **`is_complete` is strictly decoupled from the result fields — never infer completion.** It is forced
  to `false` at create (not a create input), settable both ways via update, and independent of
  `result_decisions`/`result_summary` in every combination. A session can be complete with neither
  result set, and incomplete with both set.
- **`topic`, `goal`, and `participant_role` cannot be cleared.** On update, an explicit `null` for any
  of them is a 422; omission leaves them unchanged; a new value is re-validated (topic 1–500; goal
  1–500; participant_role against the effective dictionary). The other text fields and the two link ids
  clear on explicit `null`.
- **SQLite FK actions are inert (known divergence).** `linked_story_id`/`linked_task_id` `SET NULL` and
  `project_id` `CASCADE` are not enforced on the default SQLite database. The linked-story/task
  reference-clearing on delete is therefore done application-side (TASK-004) so it holds on both
  dialects. Project→session cascade deliberately relies on the FK only (as every project child does) and
  is covered by the standing `PRAGMA foreign_keys = ON` fix — do **not** add a separate project→session
  app-level cleanup.
- **Avoid a circular import between sessions and stories/tasks.** The sessions service declares its own
  story/task reader Protocols (for link existence + owning-project resolution) and imports nothing from
  those packages; the stories/tasks services import only the session reference-cleaner Protocol from the
  sessions service. Wire concrete instances through `AppContainer`; register the new sessions package in
  the MCP `container.wire(packages=[...])` list. This mirrors the attachments↔stories arrangement
  exactly.
- **Same-project link rule.** A `linked_story_id`/`linked_task_id` pointing at an item in a *different*
  project than the session is a 422; a non-existent item is a 404. A task's owning project is resolved
  transitively (task → story → project).
- **List surface is minimal.** Filters are `incomplete`, `linked_story_id`, `include_archived`,
  `page`, `limit`, plus the required `project_id` — there is no `status` filter and no cross-project
  listing. No symmetric `linked_task_id` filter in this story (the index anticipates it as a future add).
- **The v1.0 contract's `## Sessions` block and the `architecture.md` session row are stale
  forward-spec.** Build to this plan, not to those; they are reconciled to the as-built shape (v1.8) at
  Reconcile.
- **Migration hygiene.** Revision id `0013_session` (≤32 chars for PostgreSQL's
  `alembic_version.version_num`); down-revision `0012_web_ui_role_backfill`; inline FKs toward
  already-existing parents; no seed.
- **Naming.** `Session` / `CreateSession` / `UpdateSession` — no `Body`/`Response` suffixes. REST and
  MCP must stay behaviour-identical over the one service.
- **Sessions is its own app mode, not a Task Manager tab.** It lives under the app-switcher's existing
  `Sessions` entry with a parallel shell: a left project-selection sidebar plus a main view of the
  chosen project's sessions. The `Sessions` app-switcher entry and `/sessions` route already exist as a
  placeholder — grow them into this space rather than adding a fourth sub-nav tab under
  `ProjectShell`. Two project surfaces coexist per mode and must not be conflated: the in-mode sidebar
  selects which project's sessions to view; the global Projects overlay (ADR-025) manages projects.
  Sessions routes stay in the Sessions subtree, clear of Task Manager's `/projects/:projectId/*` tree.
  Whether the Sessions sidebar reuses the Task Manager `ProjectSidebar`/`AppShell` machinery or a
  Sessions-specific variant is the frontend-developer's call, provided the two modes stay independently
  navigable.

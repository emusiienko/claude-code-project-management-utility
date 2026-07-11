# Implementation Plan: STORY-005 — Task Management

## Context

Tasks are the leaf work item of the pipeline: they belong to a Story, and the owning
Project is resolved transitively (`task → story → project`) for every dictionary-bound
validation. This story builds the Task entity end-to-end and turns two already-specified
but so-far-inert surfaces live:

- The task Kanban inside the Story Detail slide-over (`/projects/:id/stories/:storyId`),
  which today renders `TaskKanbanPlaceholder` (column headers only, no data, no endpoint calls).
- The story task-completion aggregate ("N/M done"), shown as a static "N/A" in the Stories
  list and specified as `GET /stories/:id/aggregate` — deferred from STORY-004 to this story.

The full Tasks domain, the story aggregate, and the cross-project task list are **already
present in the LOCKED v1.0 API contract** (`docs/api-contract.md` → Tasks, Stories `/aggregate`,
Cross-project Queries `GET /tasks`). This story implements that existing contract; it introduces
no new endpoints and therefore requires **no contract revision**.

This story covers only the Task entity. Task-to-task links (STORY-006), attachments (STORY-007),
and comments (STORY-008) are later stories. Consequently `GET /tasks/:id/detail` returns the task
fields plus **empty** `links`, `attachments`, and `comments` arrays, and the Task Detail modal shows
static placeholder sections for those three. The `GET /tasks/:id/dependencies` endpoint is a
task-links read and belongs to STORY-006 — it is out of scope here.

## Technical Approach

### Backend — new `tasks` domain package (mirrors the stories/milestones slice)

A new vertical-slice package following the established per-domain pattern (model, repository,
service, schema, controller, mcp_tools), wired through the global `AppContainer`:

- **Model** — the `task` table already exists in the deployed schema (created by an earlier
  migration in the initial chain, with `story_id` FK → story CASCADE and the four task indexes).
  The ORM model declares the columns and the four indexes already specified in the architecture
  (`(story_id, status)`, `(story_id, type)`, `(assignee_role)`, `(creator_role)`). No new migration
  is required unless the implementor finds the `task` table is not yet present in the applied chain,
  in which case a new root-first, inline-FK revision is added per ADR-010.
- **Repository** — extends `BaseRepository[Task]`; string→UUID coercion is inherited (a malformed id
  yields `NotFoundError`/404 per ADR-011). Provides: `coerce_story_id`, `get_by_id_and_story` (or
  equivalent scoped read), a paginated list scoped to a story with independent filters (status, type,
  assignee_role, creator_role), and a **batched status-count read** grouped by status for one story
  (mirrors the milestone repository's batched `GROUP BY` story-count query). Label handling reuses the
  existing dialect-aware JSON-array filter helper in `core/database` — no new dialect branches.
- **Service** — the single home of all task business rules. Resolves the owning project transitively
  (`task.story_id → story.project_id`) and validates the four dictionary-bound fields against the
  project's **effective** dictionaries via the existing `EffectiveDictionary` Protocol: `type` against
  `task_types`, `status` against `task_statuses`, and `assignee_role` / `creator_role` against
  `participant_roles`. Parent-story existence is asserted before any write (404 if absent). `story_id`
  is immutable on update. Delete is a permanent hard delete; deleting a story removes its tasks via the
  existing story→task CASCADE (see Constraints for the SQLite caveat). Task detail composition returns
  the task plus three empty side-collection arrays.
- **Story aggregate (on the stories service, not the tasks service)** — `GET /stories/:id/aggregate`
  is a Stories endpoint that derives per-status counts from task data. The stories service already
  depends cross-domain on the milestones repository through a runtime `Protocol` to avoid a circular
  import; the same pattern applies here: the stories service gains an optional task-repository
  dependency typed as a `Protocol` (a `get_status_counts(story_id)` batched read + a total count),
  injected via `AppContainer`. The aggregate asserts the story exists (404), then returns
  `{ story_id, total_tasks, by_status }` computed on demand — never stored. A story with no tasks
  returns `{ total_tasks: 0, by_status: {} }` (success, not an error).
- **Controller + MCP tools** — thin, behavior-identical surfaces over the service. REST routes:
  create + list under the story path, and get / update / delete / detail under the task path, exactly
  as the contract specifies. The story-aggregate route is added to the **stories** controller (and
  its MCP tool to the stories `mcp_tools.py`), since it is a Stories operation. MCP tools mirror the
  same operations; the `tasks` package is added to `container.wire(packages=[...])` so its tools
  self-register on import, and the task repository provider is added to `AppContainer` and injected
  into both the task service and the story service.

### Frontend — new `tasks` feature + two surfaces made live

- **API layer** — a `tasks` endpoints module with plain async functions for the five task operations
  (create, list-by-story, get-detail, update, delete) plus the story aggregate, unwrapping the
  `{ data }` envelope. All URL strings go in `API_PATHS`; the `Task`, `CreateTask`, `UpdateTask`,
  `TaskDetail`, and `StoryAggregate` types come from `src/api/types.ts` (derived from the contract).
  Cache keys for tasks and the aggregate are registered in `CACHE_KEYS`; stale times in `DATA_FRESHNESS`.
- **Task Kanban (replaces `TaskKanbanPlaceholder` in the slide-over)** — a `tasks` feature Kanban that
  renders one column per value in the project's effective `task_statuses` dictionary, in dictionary
  order, column names and order never hardcoded. Each column header shows the status name and a live
  card count; cards within a column are ordered by `created_at` ASC and show title, type badge,
  assignee_role (when set), and label chips. Drag-and-drop reuses the **existing board drag hook**,
  which is already domain-agnostic (it takes `validStatuses` plus `onStatusChange` / `onInvalidDrop`
  callbacks and knows nothing about `Story` or `Task`). To avoid a cross-feature import from
  `features/board/` into `features/tasks/`, that hook is **promoted to a shared kanban-drag hook** in
  `src/shared/hooks/` and the Board is switched to a thin re-export of the shared location — a
  mechanical move with no behavior change. Both kanbans then consume it from `shared`. The optimistic
  update (snapshot → `setQueryData` → `mutate` with `onError` rollback) follows the same shape as the
  Board, targeting `PUT /tasks/:id`; a card dropped on a status no longer in the effective dictionary
  shows an inline error and returns to its origin column. The drag wiring lives in the hook, not in JSX.

  **Kanban column and card structure are NOT abstracted into a shared component at this stage.** The
  two kanbans share the drag *mechanic* (the hook) but their columns and cards diverge in shape:
  task columns carry an "Add task" footer, task cards carry a type badge, assignee_role, and a hover
  Edit/Delete context menu, and the two have different click targets and layout contexts. The
  `tasks` feature owns its own `TaskColumn` / `TaskCard` built on dnd-kit's `useDroppable` /
  `useSortable`, mirroring the Board's structure. A generic slot-based `<KanbanBoard>` component is
  intentionally deferred — a single second consumer with real divergences does not justify the
  generic abstraction, and would force a risky refactor of the already-accepted Board. An **Add task** button at each column footer opens the create form with
  that column's status pre-filled and read-only. Per-card **Edit** / **Delete** use the shared
  `IconButton` primitive via a hover context menu. The **filter bar** (type, assignee_role,
  creator_role — dropdowns from effective settings) dims non-matching cards purely client-side, with
  no new API calls.
- **Create / Edit task form** — one cohesive form component owning its state: title (required, 1–500),
  type (required, from `task_types`), status (required, from `task_statuses`), content (optional
  Markdown textarea), assignee_role / creator_role (optional, from `participant_roles`), and labels
  (reusing the shared `LabelsEditor`). Submit is enabled once title + type + status are filled. All
  three dictionaries load from `GET /projects/:id/settings/effective`. API validation errors render
  inline next to the relevant field. On save, the Kanban and the aggregate counter refresh (mutation
  hooks invalidate the task list, the story aggregate, and the stories-list aggregate).
- **Task Detail modal** — a nested route `tasks/:taskId` under the existing `:storyId` slide-over
  route; `StorySlideOver` renders an `<Outlet />` so the modal mounts on top of the still-open,
  dimmed slide-over. The modal fetches `GET /tasks/:id/detail`, shows task metadata (title, type
  badge, status badge, roles, labels, rendered Markdown content) with an inline **Edit task** form
  toggle, and three static placeholder sections (Links → STORY-006, Attachments → STORY-007,
  Comments → STORY-008). A missing/malformed `:taskId` renders a "Not found" state inside the modal
  with the slide-over still open behind it. Close (✕ or Escape) navigates back to the story route,
  leaving the slide-over open.
- **Aggregate counters made live** — the "N/M done" counter appears above the Kanban and in each
  Stories-list row. Both read `GET /stories/:id/aggregate` (one fetch per visible story in the list)
  through a shared aggregate hook, and both re-fetch after every task create / update / delete. "—"
  (em-dash) renders when `total_tasks === 0`. "done" is derived as `by_status["done"]` when present,
  else 0; the total is `total_tasks`, so the counter degrades gracefully if the project renames its
  terminal status.

## Ordered Tasks

1. TASK-001: Tasks domain backend slice (backend-developer) — task ORM model, repository (scoped
   list + filters + batched status counts), service (transitive project resolution + four-dictionary
   validation + immutable `story_id` + hard delete + detail with empty side-collections), controller,
   MCP tools, and `AppContainer` wiring. No new endpoints beyond the contract.
2. TASK-002: Story aggregate endpoint (backend-developer, depends on TASK-001) — add
   `GET /stories/:id/aggregate` to the stories service (cross-domain task-count read via a runtime
   `Protocol`, on-demand `total_tasks` + `by_status`, empty-story returns zeros), its REST route, and
   its MCP tool.
3. TASK-003: Task frontend API + query layer (frontend-developer, depends on TASK-001, TASK-002) —
   task endpoint functions, aggregate endpoint function, `API_PATHS`, `CACHE_KEYS`, `DATA_FRESHNESS`
   entries, and the task + aggregate TanStack Query/mutation hooks (create/update/delete with
   optimistic status update and aggregate invalidation).
4. TASK-004: Task Kanban + create/edit form + delete in the slide-over (frontend-developer, depends
   on TASK-003) — replace `TaskKanbanPlaceholder` with the live dictionary-driven Kanban (drag-and-drop
   status update reusing the board pattern, filter bar, per-column Add, per-card Edit/Delete), the
   cohesive create/edit form, the delete confirmation dialog, and the aggregate counter above the board.
5. TASK-005: Task Detail modal route (frontend-developer, depends on TASK-003, TASK-004) — nested
   `tasks/:taskId` route under the slide-over with an `<Outlet />` mount point, the detail modal
   (metadata + inline edit + three static placeholder sections), deep-link/direct-URL rendering,
   not-found state, and Escape/✕ close-to-story behavior.
6. TASK-006: Stories-list live aggregate (frontend-developer, depends on TASK-003) — replace the
   static "N/A" task-aggregate cell with the live "N/M done" counter per visible story, refreshing
   after task mutations, "—" when `total_tasks === 0`.
7. TASK-007: Automated tests (qa-automation, depends on TASK-001, TASK-002) — `test_tasks.py` and the
   aggregate additions to `test_stories.py`.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Story aggregate ownership (stories service reads tasks data via a `Protocol`) | Record if the cross-domain read introduces a non-obvious pattern beyond the existing stories→milestones Protocol precedent — otherwise it is an application of an existing pattern and needs no ADR |
| On-demand vs stored aggregate | Only if performance forces a materialized counter; the contract mandates on-demand computation, so no ADR is expected |

## Constraints & Gotchas

- **The Tasks domain and story aggregate are already in the LOCKED v1.0 contract.** Implement the
  shapes exactly as written (`Task`, `CreateTask`, `UpdateTask`, `TaskDetail`, `StoryAggregate`); make
  no changes to `docs/api-contract.md`. If the as-built surface must diverge, stop and raise it — a
  contract revision is an architect decision.
- **`GET /tasks/:id/detail` returns empty `links`, `attachments`, and `comments` arrays** in this
  story. Those domains (STORY-006/007/008) are not built yet; the composition wiring is added when they
  land, exactly as story/milestone detail composition is staged. Do not stub or fabricate their data.
- **`GET /tasks/:id/dependencies` is out of scope** — it is a task-links read owned by STORY-006.
- **The aggregate is on the Stories service, not the Tasks service.** It reads task data cross-domain
  through a runtime `Protocol` (the established pattern for stories→milestones), never by importing the
  concrete task service. A service never depends on another domain's service — only its data layer.
- **All four task dictionary fields validate against the project's effective dictionaries**, resolved
  transitively through the story's project — `type` (`task_types`), `status` (`task_statuses`),
  `assignee_role` + `creator_role` (`participant_roles`). A disallowed value is `422 UNPROCESSABLE`
  and the message lists the allowed values.
- **Columns and column order come from the effective `task_statuses` dictionary**, both on the Kanban
  and implicitly in the aggregate's `by_status`. Never hardcode status names or ordering. A card
  dropped on a status removed from the dictionary after load shows an inline error and snaps back.
- **The drag/optimistic-update mechanics already exist for the Board (stories) and are shared, not
  duplicated.** The Board's drag hook is already domain-agnostic; promote it to `src/shared/hooks/`
  (a kanban-drag hook), switch the Board to re-export it from there, and consume it from the shared
  location in `features/tasks/`. This is a mechanical move — no behavior change to the Board. Keep the
  Board refactor limited to this hook move; do NOT restructure the accepted Board's columns/cards or
  page in this story. The task optimistic update follows the same snapshot/`onError`-rollback shape,
  targeting `PUT /tasks/:id`.
- **Share the drag mechanic only — not the column/card structure.** `TaskColumn` / `TaskCard` are
  owned by the `tasks` feature and built directly on dnd-kit primitives, mirroring the Board's
  structure. A generic slot-based `<KanbanBoard>` component is deliberately out of scope: the two
  kanbans diverge (task columns have an Add-task footer, task cards have a type badge, assignee_role,
  and a hover Edit/Delete menu, and the click targets and layout contexts differ). If a third kanban
  ever appears, extracting a generic component becomes its own refactoring story.
- **The Task Detail modal is a nested route child of the `:storyId` slide-over.** The slide-over must
  render an `<Outlet />` and stay mounted (dimmed) while the modal is on top; direct navigation to the
  task URL renders both. Closing restores the story URL with the slide-over still open.
- **SQLite FK caveat (pre-existing, cross-domain).** `PRAGMA foreign_keys = ON` is not set on the
  SQLite connection, so story→task `ON DELETE CASCADE` is inert on SQLite (enforced on PostgreSQL).
  "Delete story removes its tasks" is guaranteed on Postgres; on SQLite it currently relies on the
  same gap logged in architecture.md § Known Divergences. Do not add a new app-level cascade here to
  paper over it — it is tracked centrally with a defined fix path (enable the PRAGMA).
- **Aggregate freshness.** Every task create/update/delete must invalidate both the per-story
  aggregate and the stories-list aggregate so the two counters stay in lockstep with the board.

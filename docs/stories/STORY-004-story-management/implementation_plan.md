# Implementation Plan: STORY-004 — Story Management

## Context

Stories are the first **child** entity in the domain graph: a story belongs to exactly one
project (`story.project_id` FK → `project`, `ON DELETE CASCADE`). They are the primary unit of work
the human orchestrator and the agents read and filter. This story delivers full Story CRUD across
both access surfaces (REST + MCP) and the Stories sub-view of a project in the web UI.

The Projects domain (STORY-003, reconciled) is the direct prior art: this story replicates its
vertical-slice package layout, its service/repository/schema separation, its ID-coercion behavior
(ADR-011), and its migration authoring style (ADR-010). Two things are genuinely new and drive the
design below:

1. **Dictionary-bound writes.** A story's `status` is validated at write time against the owning
   project's *effective* `story_statuses` dictionary. This is the first domain to consume the
   `EffectiveDictionary` Protocol already exposed by the settings service (ADR-008) — establishing the
   pattern every later dictionary-bound domain (tasks, task_links, attachments) will follow.
2. **JSON label filtering.** Stories carry free-form `labels` (a JSON array of `{key, value}`) and the
   list endpoint filters by `label_key` / `label_value`. Filtering inside a JSON column is
   dialect-specific and must stay inside the data layer per the DB-agnostic constraint — the first
   place in the codebase this capability is needed.

The `stories` **backend domain package** is entirely unrelated to the `docs/stories/` SDLC folder;
they share a word, nothing else.

## Technical Approach

### Backend — new `stories` domain package

A new vertical-slice package modeled exactly on `projects`: ORM model, repository (extends the shared
`BaseRepository`), service (all business rules), Pydantic schemas (no `Body`/`Response` suffixes),
REST controller (thin), and MCP tools (thin). The controller and MCP tools are behavior-identical
wrappers over the single service — no logic in either entry layer.

**Data model.** The story row carries: `id`, `project_id`, `title`, `content`, `status`, `labels`
(JSON array), `milestone_id`, `created_at`, `updated_at` — exactly the shape already fixed in
`docs/architecture.md` and the LOCKED API contract. `milestone_id` is included as a nullable column
now because the contract and the reconciled schema already define it, but the UI does not surface it
and no milestone FK constraint is created in this story (see the milestone-FK decision below).

**Endpoints (already in the LOCKED contract — no contract change).**
- `POST /projects/:projectId/stories` → create (project must exist; status validated)
- `GET /projects/:projectId/stories?page&limit&status&label_key&label_value` → paginated, filtered list
- `GET /stories/:id` → single story
- `PUT /stories/:id` → update (title/content/status/labels; labels fully replace when provided)
- `DELETE /stories/:id` → hard delete
- `GET /stories/:id/aggregate` is defined in the contract but is **out of scope for this story** — it
  derives per-status counts from tasks, and tasks do not exist until STORY-005. The frontend list shows
  "N/A" for the task aggregate and does not call this endpoint. (Called out in Constraints below.)

**Validation split (follows ADR-011 and the ratified convention).**
- *Field-level* (title non-empty + ≤500, content ≤50000) lives in the Pydantic input schemas via
  `@field_validator` and fails as 422 before the service runs. Entry layers pass string IDs straight
  through; they never parse UUIDs.
- *Business-rule* validation lives in the service: parent-project existence (404 if missing), and
  status membership in the project's effective `story_statuses` (422 `UNPROCESSABLE` when violated).
- ID coercion is inherited from `BaseRepository._coerce_uuid`: a malformed `:id` or `:projectId`
  surfaces as 404, not 422 (ADR-011). No new coercion code.

**Effective-dictionary dependency.** The story service receives the settings service through the
`EffectiveDictionary` Protocol (already defined in the settings package) — never a concrete import of
`SettingsService`. Before persisting a create/update that sets a non-null status, the service resolves
the owning project's effective `story_statuses` and asserts membership. A `null` status is always
valid (removing a status is allowed). The error message format is fixed by the acceptance criteria:
`Status value '{v}' is not allowed. Allowed: {comma-separated list}.`

**Repository — label filtering.** The story repository owns a single paginated-list query that
optionally narrows by `project_id`, `status`, `label_key`, and `label_value`. The JSON label
predicate is dialect-aware and fully contained in the repository: on SQLite it uses the `json_each`
table-valued function to test membership; on PostgreSQL it uses `jsonb` containment/path operators.
The service and controller see one interface (`label_key`/`label_value` args) and never touch SQL
dialect. Filtering by a label key no story has returns an empty page, not an error. `label_value`
without `label_key` and vice-versa are both accepted (each narrows independently).

**Labels normalization.** Labels arrive as a list of `{key, value}` objects; `key` is required and
non-empty (enforced in the schema). On update, providing `labels` replaces the entire array; omitting
it leaves labels unchanged; providing `[]` clears all labels (valid). The service treats the incoming
list as the complete new set — no merge.

**Migration.** One new Alembic revision `0003_story`, `down_revision = "0002_settings"`, appended to
the existing dependency-ordered chain (ADR-010). It creates the `story` table with an **inline** FK to
`project` (`ON DELETE CASCADE`) — valid because `project` already exists from `0001`. It creates the
indexes the schema specifies: `(project_id, created_at DESC)`, `(project_id, status)`, and
`(milestone_id)`. It seeds nothing (stories have no seed data). It is written dialect-portably (UUID
columns as `String(36)` in DDL, matching the existing revisions).

**Milestone FK — deferred, no constraint now.** The schema calls for `story.milestone_id` → `milestone`
`ON DELETE SET NULL`, but the `milestone` table is not created until STORY-012. Under the root-first,
inline-FK migration strategy (ADR-010) a child FK can only point at an already-existing parent, so
`0003_story` creates `milestone_id` as a plain nullable column **without** a foreign-key constraint.
STORY-012's migration, when it creates `milestone`, adds the FK constraint at that point (portably;
SQLite requires `batch_alter_table` to add a constraint to an existing table, which STORY-012 will
handle in its own migration). This keeps the chain append-only and every FK pointing backward. Recorded
as a Planned ADR because a later engineer must understand why this one column has no DB-level FK yet.

### Frontend — new `stories` feature + reusable Labels editor

**Routing.** Add a nested route `/projects/:id` (Stories View) and register it under the existing
Layout route. This is a *sub-view of a project*, reached by clicking a project name in the Projects
list — it does not add a top-level nav entry (the 3-item nav rule holds). The Projects list rows gain
a navigable project-name link to `/projects/:id`. Story detail (`/projects/:id/stories/:storyId`) is
referenced by the list as a link target for a future story-detail screen; this story implements only
the Stories **list** view and its create/edit/delete modals. The detail route itself is out of scope
here (no story-detail screen yet) — the title link is present per the description but the destination
screen arrives with a later story; for this story the title link opens the edit modal so the row action
is functional. (Confirm this UX choice at checkpoint.)

**API layer.** New `endpoints/stories.ts` with one plain async function per Story endpoint
(list/create/get/update/delete), unwrapping the envelope. New `API_PATHS` entries for the story
routes. The `CreateStory`/`UpdateStory`/`Story`/`Label` types already exist in `api/types.ts` and the
`stories.*` cache keys already exist in `cacheConfig.ts` — reuse them; do not redeclare.

**Hooks.** New `features/stories/hooks/useStories.ts`: a filtered+paginated list query keyed by
project id + filter params, plus create/update/delete mutations that invalidate the story list key.
The status-dropdown data source is the existing `useProjectSettingsEffective(projectId)` hook — reuse
it; the dropdown reads `story_statuses` from the effective settings. The project name for the page
heading comes from the existing `useProjectDetail(id)` hook.

**Reusable Labels editor.** The description references "the same Labels Editor component used
throughout the app," but no such component exists yet — only `DictionaryEditor`, which edits a flat
`string[]`, a different shape. Labels are `{key, value}` pairs. Build a new **shared** component
`shared/components/LabelsEditor.tsx` (key-value pair add/remove editor) so tasks and comments can reuse
it later. It uses the shared `IconButton` primitive for per-row remove and follows the icon/text-button
split (Add is a text button; per-row remove is an icon button). It is a controlled component: value in,
onChange out — no data fetching, no business logic.

**Screens/components.** `features/stories/StoriesPage.tsx` (page orchestration only), plus
feature-local components: a filter bar (status dropdown + label key/value text inputs), the stories
table (title link, status badge, label chips, "N/A" task aggregate, edit/delete icon buttons), a
story modal (create/edit) wrapping a story form (title, content textarea, status dropdown, LabelsEditor),
a delete confirmation dialog, and an empty state with a "New story" CTA. These mirror the Projects
screen's component decomposition (`ProjectList`/`ProjectModal`/`ProjectForm`/`DeleteProjectDialog`).
All loading/error/empty states render distinct queryable UI per the conventions.

**No optimistic updates** for this story — mutations invalidate and refetch (the board's optimistic
drag-and-drop is a Tasks concern). Filters live in page-level `useState` and feed the list query key.

## Ordered Tasks

1. TASK-001: Story data model & migration (backend) — ORM model + `0003_story` migration with inline
   project FK, three indexes, and the FK-less `milestone_id` column.
2. TASK-002: Story repository & service (backend, depends on TASK-001) — repository with dialect-aware
   label-filtered paginated list; service with parent-existence, effective `story_statuses` validation
   via the `EffectiveDictionary` Protocol, and label-replace semantics.
3. TASK-003: Story REST controller & MCP tools & DI wiring (backend, depends on TASK-002) — five REST
   routes and five mirrored MCP tools over the shared service; register the story repository/service in
   the container and the router/tool modules in composition.
4. TASK-004: Reusable Labels editor (frontend, shared) — controlled key-value pair editor in `shared/`;
   no dependency on backend tasks, can start in parallel.
5. TASK-005: Stories API layer & hooks (frontend, depends on TASK-003 for a running API) — endpoint
   functions, path constants, and the list/create/update/delete TanStack Query hooks.
6. TASK-006: Stories list screen & CRUD UI (frontend, depends on TASK-004 + TASK-005) — nested route,
   Projects-list name link, filter bar, table, create/edit modal + form, delete dialog, empty state.
7. TASK-007: Automated tests (qa-automation, depends on TASK-003 for backend; TASK-006 for frontend)
   — endpoint, behavior, and edge-case coverage per the acceptance criteria.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Dialect-aware JSON label filtering in the data layer | Confirmed once the SQLite `json_each` / PostgreSQL `jsonb` split is implemented in the story repository and proven portable — first JSON-array filter in the codebase, reusable by tasks/comments. |
| Deferred milestone FK on `story.milestone_id` (column without constraint until STORY-012) | Confirmed once `0003_story` ships `milestone_id` as an FK-less column; documents why the root-first chain (ADR-010) cannot add the FK before the `milestone` table exists. |

## Constraints & Gotchas

- **`GET /stories/:id/aggregate` is NOT implemented in this story.** It depends on tasks (STORY-005).
  The list UI shows "N/A" for the task aggregate and must not call the aggregate endpoint. Do not build
  it now.
- **Status validation resolves the *effective* dictionary, not the system default.** Always go through
  the `EffectiveDictionary` Protocol so a project-level `story_statuses` override is honored.
- **`null` status is always valid**, including on update to remove a previously-set status. Only a
  *non-null* status is checked against the dictionary.
- **Labels replace, never merge.** `PUT` with `labels: []` clears all labels (valid); `PUT` omitting
  `labels` leaves them untouched. Match the project/settings replace-semantics precedent.
- **ID coercion is inherited** from `BaseRepository` — do not add per-service UUID parsing. A malformed
  `:projectId` or `:id` returns 404 (ADR-011), not 422.
- **JSON filtering stays in the repository.** No dialect-specific SQL may appear in the service or
  controller. Filtering by an absent label key returns an empty list, never an error.
- **The reusable Labels editor must go in `shared/`**, not inside the stories feature — tasks and
  comments will consume it. A component in one feature must never be imported by another feature.
- **Do not surface `milestone_id` in the UI.** The form and table omit it entirely; milestone
  assignment arrives with STORY-012. The backend column exists but is never set by this story's UI.
- **Contract is LOCKED and already covers Stories** — no `docs/api-contract.md` change is needed for
  this story. If implementation reveals a genuine gap, stop and raise it; do not edit the contract.
- **Migration chain is append-only and root-first (ADR-010).** `0003_story` must set
  `down_revision = "0002_settings"` and declare its project FK inline.

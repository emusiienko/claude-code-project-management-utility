# AI Agent Coordination Utility

A single-developer, locally-hosted utility that stores the operational state of a multi-agent dev
pipeline (projects, stories, tasks, sessions, attachments) outside of git — accessible to AI agents
via an MCP server and to the human orchestrator via a web UI.

## Repository Structure
| Folder | Purpose |
|--------|---------|
| `backend/` | Python app — REST API + MCP server over a shared per-app service layer |
| `backend/app/<domain>/` | One package per domain (projects, stories, tasks, task_links, attachments, comments, sessions, milestones, settings) |
| `backend/app/core/` | Cross-cutting: config, DB engine/session, errors, storage, dictionary resolution |
| `backend/migrations/` | Alembic migrations |
| `frontend/` | React 19 + Vite SPA (screen-based: `src/screens`, `src/shared`, `src/core`, `src/api`) |
| `docs/` | SDLC documentation |

## Commands
> Canonical commands are owned by **devops** (`docker-compose.yml`, `deploy.sh`) and the dev
> conventions docs. Placeholders below — update during implementation.

| Command | Description |
|---------|-------------|
| `docker compose up` | Start full stack (REST :8000, MCP :8001, Web :3000) on localhost |
| `./deploy.sh` | Single entry point (owned by devops) |
| `alembic upgrade head` | Apply DB migrations |

## Key Docs
- Architecture: docs/architecture.md
- API Contract: docs/api-contract.md  ← **v1.0 LOCKED** (v1.2 Milestones single-project + lifecycle; v1.3 Work Item Linking — story_links + StoryDetail.links + task-link scope narrowed to same-story)
- Tech Decisions: docs/tech_decisions/ (ADR-001 … ADR-018; ADR-009 superseded by ADR-010)
- Backend Conventions: docs/backend-coding-conventions.md  ← owned by backend-developer (TBD)
- Frontend Conventions: docs/frontend-coding-conventions.md ← owned by frontend-developer (TBD)
- DevOps Strategy: docs/devops-strategy.md ← owned by devops (TBD)
- Requirements: docs/requirements.md (backend + web)
- User Stories: docs/stories/index.md
- Team / active roles: docs/team.md

## Code Map

- `backend/app/main.py` — application entry point; wires DI container, registers middleware + exception handlers, mounts REST router + MCP server on the same port (:8000)
- `backend/app/config.py` — typed `Settings` via pydantic-settings; single reader of all environment variables
- `backend/app/exc_handlers.py` — FastAPI exception handlers: `domain_error_handler`, `request_validation_error_handler`; `_build_error_body` helper
- `backend/app/core/errors.py` — `ErrorCode` enum; `DomainError` class hierarchy (one subclass per HTTP status)
- `backend/app/core/database/` — `Base`, `UUIDType`, `build_engine()` (SQLite WAL), session factory, `BaseRepository[T]`, `apply_json_array_filter()` (dialect-aware JSON array filtering for SQLite and PostgreSQL)
- `backend/app/core/storage/` — `FilesystemStorage` with write/read/snapshot for attachment files
- `backend/app/container/` — `AppContainer` DI composition root; providers for all domains (Settings, Projects, Stories, Tasks, TaskLinks, StoryLinks, Milestones); `task_link_service` and `story_link_service` are injected into `task_service` and `story_service` as Protocol readers (STORY-006); `container` singleton exported for wiring; `mcp_dependencies.py` — one `provide_<domain>_service` bridge per domain (`@asynccontextmanager` + `@inject`), used via `fastmcp.dependencies.Depends()`
- `backend/app/api/` — FastAPI app factory shell; CORS + error handler registered; domain routers added in TASK-004+
- `backend/app/mcp/` — `FastMCP` server (HTTP Streamable transport, path-mounted at `/mcp`); Settings tools registered; future domains add tools via `register_*_tools(mcp_server)`
- `backend/app/settings/` — `constants.py` (six `DICT_KEY_*` constants, `ALL_DICT_KEYS`, `validate_dict_key()`); `SystemSettings` + `ProjectSettings` ORM models; `SystemSettingsRepository` + `ProjectSettingsRepository`; `SettingsService` (all business rules; implements `EffectiveDictionary` Protocol); `EffectiveDictionary` + `ProjectChecker` Protocols in `service.py`; `schema.py` (Pydantic request/response schemas); `dependencies.py` (`_get_db` + `get_settings_service` FastAPI Depends); `controller.py` (5 route handlers under `/v1`); `mcp_tools.py` (5 MCP tools mirroring the REST surface)
- `backend/app/projects/` — `Project` ORM model (`model.py`); `ProjectRepository` with `list_paginated`, `get_by_name_lower`, `get_name_conflict` (`repository.py`); `ProjectService` (create/get/list_paginated/update/delete, all validation + uniqueness rules, `service.py`); `schema.py` (`CreateProjectBody`, `UpdateProjectBody`, `ProjectResponse`, `PaginationMeta`); `controller.py` (5 REST route handlers: POST/GET list/GET by id/PUT/DELETE under `/v1/projects`); `mcp_tools.py` (5 MCP tools mirroring the REST surface: `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`)
- `backend/app/stories/` — `Story` ORM model (`model.py`); `StoryRepository` with `coerce_project_id`, `get_by_id_and_project`, `list_paginated` (optional `milestone_id_filter` for board filtering), `list_paginated_by_milestone` (`repository.py`); `StoryService` (create/get/get_by_id/list_paginated/update/delete/get_aggregate/get_detail; `milestone_id` validation via `MilestoneRepositoryProtocol`; on-demand task aggregate via injected `TaskCounterProtocol`; story-link enrichment + cascade delete via injected `StoryLinkReaderProtocol`; three Protocols defined at module level, `service.py`); `schema.py` (`Label`, `CreateStory`, `UpdateStory`, `Story`, `StoryDetail`, `StoryAggregate`, `PaginationMeta`); `controller.py` (7 REST route handlers: CRUD + `GET /{id}/detail` + `GET /{id}/aggregate`; `milestone_id` query param on list); `mcp_tools.py` (7 MCP tools: CRUD + `get_story_detail` + `get_story_aggregate`; `milestone_id` param on `list_stories`)
- `backend/app/milestones/` — `Milestone` ORM model (`model.py`); `MilestoneRepository` with `get_name_conflict`, `get_active_for_project`, `list_paginated`, `get_story_counts` (batched, no N+1), `get_story_count`, `clear_story_links` (`repository.py`); `MilestoneService` (create/get/get_with_story_count/list_paginated/update/delete/activate/finish/list_stories; single-active-per-project invariant maintained atomically in `activate`; delete clears story links, `service.py`); `schema.py` (`CreateMilestone`, `UpdateMilestone`, `Milestone`, `PaginationMeta`; `MILESTONE_STATUS_*` constants); `controller.py` (7 REST handlers: CRUD + activate + finish + list stories under `/v1/milestones`); `mcp_tools.py` (7 MCP tools mirroring REST)
- `backend/app/tasks/` — `Task` ORM model with 4 indexes (`model.py`); `TaskRepository` with `coerce_story_id`, `get_by_id_and_story`, `list_paginated` (story-scoped + 4 independent filters + dialect-aware label filter via `apply_json_array_filter`), `get_status_counts` (batched GROUP BY for story aggregate), `get_total_count` (`repository.py`); `TaskService` (create/get/list/update/delete; `get_detail` now returns `tuple[Task, list]` populated from injected `TaskLinkReaderProtocol`; cascade delete calls `delete_all_for_task` before `_repo.delete`; `TaskLinkReaderProtocol` defined at module level; `service.py`); `schema.py` (`Label`, `CreateTask`, `UpdateTask`, `Task`, `TaskDetail`, `PaginationMeta`); `controller.py` (6 REST routes across two routers: `stories_router` for `POST/GET /v1/stories/{id}/tasks`; `tasks_router` for `GET/PUT/DELETE /v1/tasks/{id}` and `GET /v1/tasks/{id}/detail`); `mcp_tools.py` (6 MCP tools: `create_task`, `list_tasks`, `get_task`, `get_task_detail`, `update_task`, `delete_task`)
- `backend/app/task_links/` — `TaskLink` ORM model with 2 CASCADE FKs to task + uniqueness constraint + 2 directional indexes (`model.py`); `TaskLinkRepository` with `find_duplicate`, `list_for_task` (direction + link_type filters + pagination), `get_linked_task_summaries` (batch-load in one query, no N+1), `delete_all_for_task`, `list_all_for_task` (`repository.py`); `TaskLinkService` (create with 5-rule validation in precedence order: 404→422→422→422→409; list with direction filter + batch enrichment; delete; `list_all_enriched_for_task` and `delete_all_for_task` for TASK-003, `service.py`); `schema.py` (`CreateTaskLink`, `TaskLink`, `EnrichedTaskLink`, `LinkedTaskSummary`, `PaginationMeta`); `controller.py` (2 routers: `task_links_router` for `POST/GET /v1/tasks/:taskId/links`; `task_links_top_router` for `DELETE /v1/task-links/:id`); `mcp_tools.py` (3 MCP tools: `create_task_link`, `list_task_links`, `delete_task_link`)
- `backend/app/story_links/` — `StoryLink` ORM model with 2 CASCADE FKs to story + uniqueness constraint + 2 directional indexes (`model.py`); `StoryLinkRepository` with `find_duplicate`, `list_for_story` (direction + link_type filters + pagination), `get_linked_story_summaries` (batch-load in one query, no N+1), `delete_all_for_story`, `list_all_for_story` (`repository.py`); `StoryLinkService` (create with 5-rule validation: 404→422/project-scope→422/self→422/dict→409/dup; project resolved directly from source story's `project_id`; list with direction filter + batch enrichment; delete; `list_all_enriched_for_story` and `delete_all_for_story` for TASK-003, `service.py`); `schema.py` (`CreateStoryLink`, `StoryLink`, `EnrichedStoryLink`, `LinkedStorySummary`, `PaginationMeta`); `controller.py` (2 routers: `story_links_router` for `POST/GET /v1/stories/:storyId/links`; `story_links_top_router` for `DELETE /v1/story-links/:id`); `mcp_tools.py` (3 MCP tools: `create_story_link`, `list_story_links`, `delete_story_link`)
- `backend/migrations/` — Alembic env.py (reads DATABASE_URL from settings); `0001_project` (project table + Test Project seed); `0002_settings` (system_settings + project_settings with inline FK to project + six default dictionaries seed); `0003_story` (story table with inline FK to project, three indexes, FK-less milestone_id column); `0004_milestone` (milestone table with inline FK to project, composite functional unique index on (project_id, LOWER(name)), deferred story.milestone_id FK resolved via batch_alter_table); `0005_task` (task table with inline FK to story.id ON DELETE CASCADE, four indexes); `0006_task_link` (task_link table with two inline CASCADE FKs to task, uniqueness constraint, two directional indexes); `0007_story_link` (story_link table with two inline CASCADE FKs to story, uniqueness constraint, two directional indexes)
- `frontend/src/app/` — application composition root: App.tsx (providers), RootLayout.tsx (flat root shell + TopBar), TopBar.tsx (app-switcher combobox + Settings button; `LAST_TASK_MANAGER_URL_KEY` constant), AppShell.tsx (Task Manager mode shell; mounts ProjectSidebar), ProjectSidebar.tsx (collapsible sidebar: project combobox, project list, Gestisci progetti link, collapse toggle; `SIDEBAR_COLLAPSED_KEY`), ProjectShell.tsx (per-project sub-nav shell), RootRedirect.tsx (/ index redirect + `LAST_PROJECT_KEY`), router.tsx (three-level nested route table), queryClient.ts (TQ singleton), index.css (global styles); Layout.tsx is dead code (superseded, to be deleted at reconcile)
- `frontend/src/core/client.ts` — typed fetch wrapper; `ApiRequestError` class; `apiClient` with get/post/put/patch/delete/upload methods
- `frontend/src/api/types.ts` — all API contract TypeScript interfaces (derived from docs/api-contract.md v1.0)
- `frontend/src/api/paths.ts` — centralized `API_PATHS` constant; all URL strings live here
- `frontend/src/api/api_config.ts` — `PAGINATION` page-size limits and `DATA_FRESHNESS` stale times per domain
- `frontend/src/config/cacheConfig.ts` — `CACHE_KEYS` registry: all TanStack Query cache keys for every domain
- `frontend/src/api/endpoints/settings.ts` — plain async functions for all six Settings API endpoints
- `frontend/src/api/endpoints/projects.ts` — plain async function for GET /v1/projects; full CRUD added in STORY-003
- `frontend/src/api/endpoints/stories.ts` — plain async functions for all five Story endpoints (list, create, get, update, delete); `listStories` returns the full `ListEnvelope<Story>` for pagination metadata access
- `frontend/src/shared/components/PageLoader.tsx` — full-page accessible loading spinner (aria-busy)
- `frontend/src/shared/components/PlaceholderScreen.tsx` — generic "coming soon" screen used by all not-yet-implemented features
- `frontend/src/shared/components/IconButton.tsx` — shared icon-button primitive for item/row-level actions; owns the full visual contract (size, intent variants, hover/focus/disabled states)
- `frontend/src/shared/components/LabelsEditor.tsx` — controlled key-value pair editor for labels (add/remove `{ key, value }` pairs); also re-exports the `Label` type
- `frontend/src/shared/utils/linkLabels.ts` — `getLinkLabel(linkType, direction)` for badge rendering; `getLinkOptions(linkTypes)` expands each key into two `LinkOption` picker entries (outbound + inbound); `LinkOption` and `Direction` types exported for consuming components
- `frontend/src/shared/hooks/useLocalStorage.ts` — typed, reactive browser local storage hook; backs sidebar collapsed state, last-visited project ID, and per-story slide-over panel state
- `frontend/src/shared/hooks/useProjectList.ts` — cross-feature TanStack Query hook for the project list
- `frontend/src/shared/hooks/useProjectDetail.ts` — cross-feature TanStack Query hook for a single project; distinguishes 404 (not found) from other errors for inline "Not found" rendering
- `frontend/src/features/projects/` — Project Management screen: ProjectsPage (list + create/edit/delete), components/ (ProjectList, ProjectModal, ProjectForm, DeleteProjectDialog), hooks/ (useProjects — list query + CRUD mutations), utils/ (errorMessages)
- `frontend/src/features/stories/` — Stories sub-view: StoriesPage (filter bar + list + create/edit/delete), components/ (StoryList, StoryModal, StoryForm — includes optional milestone selector populated from project milestones, DeleteStoryDialog, StorySlideOver — renders TaskKanban + Outlet for tasks/:taskId child route (TaskDetailModal), TaskKanbanPlaceholder — superseded by TaskKanban (TASK-004), StoryRightPanel, MilestoneAssignment), hooks/ (useStories — list+detail queries + CRUD mutations), utils/ (errorMessages); route: /projects/:projectId/stories (STORY-016); slide-over at /projects/:projectId/stories/:storyId; task detail modal at /projects/:projectId/stories/:storyId/tasks/:taskId
- `frontend/src/features/board/` — Board kanban view at /projects/:projectId/board; BoardPage (DndContext, column layout, optimistic status update, milestone combobox filter via BoardMilestoneFilter), components/ (BoardColumn — droppable column, BoardCard — draggable card with inline error, BoardMilestoneFilter — milestone `<select>` combobox with "All stories" + status hints), hooks/ (useBoardDrag — thin wrapper re-exporting shared/hooks/useBoardDrag with `activeStoryId` alias for backward compat; useBoardStories — board-specific story fetch with optional milestone_id filter, useBoardMilestoneFilter — fetches all project milestones + selectedMilestoneId state defaulting to active milestone; resets on project navigation change)
- `frontend/src/api/endpoints/tasks.ts` — plain async functions for all five Task endpoints (create, list, get, update, delete) plus `getStoryAggregate`; `listTasks` returns full `ListEnvelope<Task>`
- `frontend/src/features/tasks/` — Tasks feature: TasksPage (placeholder), components/ (TaskKanban — live dictionary-driven kanban replacing TaskKanbanPlaceholder; TaskColumn — droppable column with Add task footer; TaskCard — draggable card with type badge, assignee_role, label chips, hover Edit/Delete; TaskFilterBar — client-side type/assignee/creator filter bar; TaskForm — cohesive create/edit form with LabelsEditor; TaskModal — modal wrapper for TaskForm; DeleteTaskDialog — delete confirmation; TaskDetailModal — full-screen modal at tasks/:taskId nested route, renders on top of StorySlideOver via Outlet, shows task metadata + inline edit + three placeholder sections, capture-phase Escape handler), hooks/ (useTasks.ts — useTaskList, useTask, useTaskDetail, useStoryAggregate, useCreateTask, useUpdateTask with optimistic status update, useDeleteTask; all mutations invalidate task list + story aggregate), utils/ (errorMessages — extractErrorMessage + extractFieldErrors)
- `frontend/src/shared/hooks/useBoardDrag.ts` — promoted shared kanban-drag hook (domain-agnostic); `KanbanDragHandlers` interface with `activeItemId`; consumed by both Board and Task Kanban
- `frontend/src/shared/hooks/useStoryAggregate.ts` — cross-feature re-export of useStoryAggregate for the Stories list (TASK-006) to consume without importing from features/tasks/
- `frontend/src/features/task-links/` — Task Links feature: TaskLinksPage (placeholder); hooks/ (useTaskLinks.ts — useTaskLinkList, useCreateTaskLink (accepts optional sourceTaskId for inbound direction swap), useDeleteTaskLink; mutations invalidate link list + task rich-detail)
- `frontend/src/features/story-links/` — Story Links feature: hooks/ (useStoryLinks.ts — useStoryLinkList, useCreateStoryLink (accepts optional sourceStoryId for inbound direction swap), useDeleteStoryLink; mutations invalidate link list + story rich-detail); components/ (StoryLinksSection — live Links section with enriched list + direction indicator + link_type badge + clickable story title navigation + add-link form (directional options via getLinkOptions) + delete dialog; AddStoryLinkForm — target story selector + directional link_type dropdown (LinkOption[]); DeleteStoryLinkDialog — confirmation alertdialog)
- `frontend/src/api/endpoints/taskLinks.ts` — plain async functions for task-link endpoints: createTaskLink, listTaskLinks (returns full ListEnvelope), deleteTaskLink
- `frontend/src/api/endpoints/storyLinks.ts` — plain async functions for story-link endpoints: createStoryLink, listStoryLinks (returns full ListEnvelope), deleteStoryLink
- `frontend/src/features/attachments/` — Attachments placeholder page (STORY-007)
- `frontend/src/features/comments/` — Comments placeholder page (STORY-008)
- `frontend/src/features/sessions/` — Sessions placeholder page (STORY-009)
- `frontend/src/features/milestones/` — Milestones feature: MilestonesPage (list + CRUD + activate/finish; TASK-003/TASK-004), MilestoneDetailPage (detail at /milestones/:id — name, status badge, description, paginated assigned stories list; BUG-008), components/ (MilestoneList — table with status action buttons + clickable name links to detail, MilestoneForm, MilestoneModal, DeleteMilestoneDialog, ActivateMilestoneDialog — confirmation when activating over an already-active milestone), hooks/ (useProjectMilestones, useMilestone, useMilestoneStories, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useActivateMilestone, useFinishMilestone), utils/ (errorMessages)
- `frontend/src/api/endpoints/milestones.ts` — plain async functions for all eight Milestones API endpoints (list, create, get, update, delete, activate, finish, listMilestoneStories)
- `frontend/src/features/stories/components/MilestoneAssignment.tsx` — self-contained inline milestone set/clear control inside StoryRightPanel; fetches project milestones via useProjectMilestones; delegates update to parent via onAssign callback
- `frontend/src/features/cross-project/` — Cross-project view placeholder page (STORY-011)
- `frontend/src/features/settings/` — Settings feature: SettingsPage.tsx (system-only /settings page), ProjectSettingsPage.tsx (/projects/:id/settings — project dictionary overrides via EffectiveSettingsPanel), components/ (SystemSettings, ProjectSettings + exported EffectiveSettingsPanel, DictionaryEditor), hooks/ (useSystemSettings, useProjectSettings)
- `frontend/src/features/tasks/components/TaskLinksSection.tsx` — orchestrates the full Links section in TaskDetailModal: enriched list, AddTaskLinkForm, DeleteTaskLinkDialog; reads link_types from cached effective settings and task list from cached story-scoped task query
- `frontend/src/features/tasks/components/TaskLinkRow.tsx` — single enriched task link row: direction indicator (→/←), link_type badge, clickable linked-task title (React Router Link to task detail route), status chip, destructive IconButton
- `frontend/src/features/tasks/components/AddTaskLinkForm.tsx` — inline form for creating a task link: target task `<select>` (same story, current task excluded) + directional link_type `<select>` (LinkOption[] from getLinkOptions); passes direction to onSubmit so TaskLinksSection can swap source/target for inbound
- `frontend/src/features/tasks/components/DeleteTaskLinkDialog.tsx` — alertdialog confirmation for removing a task link; z-index above TaskDetailModal

## Infrastructure

Single environment: the developer's local machine (Docker Compose, localhost-only). All published ports bind to `127.0.0.1` — this is the only access boundary (no auth, by design).

| Service | URL (localhost) | Notes |
|---------|-----------------|-------|
| Backend (REST + MCP) | http://localhost:8000 | One Uvicorn process; MCP path-mounted at `/mcp`; OpenAPI docs at `/v1/docs` |
| Web UI | http://localhost:3000 | nginx serving the static React (Vite) build |
| PostgreSQL (opt-in) | localhost:5432 | Only under the `postgres` profile; absent on the SQLite default |

**Run** (single entry point — the user runs this, never an agent):

| Command | Description |
|---------|-------------|
| `./deploy.sh up` | Build images, run migrations, start the stack |
| `./deploy.sh down` | Stop the stack (named volumes preserved) |
| `./deploy.sh rebuild` | Rebuild images (no cache), then up |
| `./deploy.sh migrate` | Run `alembic upgrade head` only |
| `./deploy.sh logs` | Follow stack logs |

**Database**: SQLite is the **default** (`sqlite:///data/app.db`, WAL, on the `sqlite_data` volume — no container). PostgreSQL is **opt-in**: set `DATABASE_URL=postgresql+psycopg://...` in `.env` and `deploy.sh` auto-activates the `postgres` profile. The same Alembic migrations run unchanged on both dialects; the backend entrypoint applies them before serving.

**Config**: all via env vars (`.env`, git-ignored; copy from `.env.example`). No application secrets (no auth, local-only); the only credential is the local Postgres password, used between containers only.

**Volumes** (survive `down`; wiped only by `docker compose down -v`): `sqlite_data` (SQLite file), `pg_data` (Postgres data), `attachments` (attachment files + version snapshots).

**IaC files**: `docker-compose.yml`, `deploy.sh`, `backend/Dockerfile` (+ `docker-entrypoint.sh`), `frontend/Dockerfile` (+ `nginx.conf`), `.env.example`.

**Backend image dependencies**: installed with **uv** (`uv sync --frozen` against the committed `backend/uv.lock`), matching the local dev toolchain for reproducible locked builds. `alembic` and `uvicorn` resolve from the uv-managed venv via `PATH` — the entrypoint and CMD are unchanged. Do not reintroduce `pip install` in the backend image.

## Gotchas
- **No auth, by design.** Docker localhost port mapping is the only access boundary. Never add login/roles/RBAC. `*_role` fields are descriptive metadata, not access control.
- **DB is configurable (SQLite default | PostgreSQL) via `DATABASE_URL`.** Keep all code DB-agnostic; dialect-specific logic (JSON `labels` filters, UUID type, case-insensitive uniqueness) stays inside the data layer. SQLite must run in WAL mode.
- **REST and MCP share one service layer.** Put business logic in the app `service`, never in a controller or MCP tool. Both surfaces must stay behavior-identical.
- **Attachment content lives on the filesystem** (attachments Docker volume), not in the DB. `file_path` is server-internal and must never appear in API responses. Documents/images are archived, never deleted; only external-ref is deletable.
- **The utility stores facts; it never enforces process** — no blocking on dependencies, no workflow automation, no status transition rules.
- **API contract is LOCKED at v1.0** — do not change shapes without an architect-approved revision.
- **Top-level nav is exactly 3 items** (Projects `/`, Sessions `/sessions`, Settings `/settings`). All other domains are sub-views under their parent context — do not add them as top-level nav entries. Routes exist as placeholder screens; STORY-003+ fill them in.
- **Clear-override is broken end-to-end (known gap, STORY-002).** Service has `clear_project_setting` but no REST/MCP route exposes it; the frontend calls a non-existent `DELETE /projects/:id/settings/:key`. Needs a contract revision + backend route. See `docs/architecture.md` § Known Divergences.

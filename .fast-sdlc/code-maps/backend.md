# Backend Code Map

Module/function-level account of where things live in `backend/`, owned by coder (backend), kept
current at Reconcile. More granular than the folder-level Repository Structure in root `CLAUDE.md`.
Organized by the repo's existing top-level source folders under `app/` — one package per domain
(`model.py`, `repository.py`, `service.py`, `schema.py`, `controller.py`, `mcp_tools.py`), plus
`core/` for cross-cutting concerns. Paths below are relative to `backend/` unless stated otherwise.
Business logic lives in each domain's `service.py` only — `controller.py` (REST) and `mcp_tools.py`
(MCP) are thin, behavior-identical callers of the same service methods.

---

## app/core/ — cross-cutting database, errors, storage

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `core/database/base.py` | Shared ORM base | `Base` | Every model inherits this declarative base. |
| `core/database/engine.py` | Dialect-agnostic engine factory | `build_engine`, `_enable_wal_mode` | `_enable_wal_mode` is a SQLite-only `connect` listener; no-op on PostgreSQL. |
| `core/database/session.py` | Request-scoped DB session | `build_session_factory`, `init_db_session` | `init_db_session` is wired into the DI container as `db_session`. |
| `core/database/types.py` | DB-agnostic column types | `UUIDType`, `UTCDateTime` | `UUIDType`: native `UUID` on PostgreSQL, `CHAR(32)` hex on SQLite. `UTCDateTime` (STORY-013): wraps `DateTime(timezone=True)` (no DDL change); bind rejects naive input and normalizes to UTC, result reattaches UTC to naive values (SQLite drops the offset). Every `created_at`/`updated_at`/`archived_at` column in every domain `model.py` uses it. |
| `core/database/json_utils.py` | Dialect-branching JSON-array filters | `apply_json_array_filter`, `apply_json_scalar_array_contains_filter` | Private `_apply_sqlite*`/`_apply_postgresql*` halves; the one place JSON-query dialect differences live. |
| `core/database/repository.py` | Generic CRUD base | `BaseRepository[ModelT]` (`get_all`, `get_by_id`, `exists`, `count`, `save`, `delete`, `_coerce_uuid`) | Every domain repository subclasses this; `_coerce_uuid` backs every domain's own `coerce_*_id`. |
| `core/storage/filesystem.py` | Attachment byte storage | `FilesystemStorage` (`write`/`read`/`delete`/`snapshot`) | Rooted at `settings.attachments_dir`; the `file_path` it manages is server-internal, never returned in an API response. |
| `core/errors.py` | Shared error vocabulary | `ErrorCode`, `DomainError` + subclasses (`ValidationError`, `NotFoundError`, `ConflictError`, `UnprocessableError`, `InternalError`) | `DomainError.to_tool_error()` is the REST/MCP error-shape bridge. |

## app/container/ — dependency injection wiring

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `container/container.py` | Single DI container for the app | `AppContainer` | Domain packages own no providers of their own; declaration order encodes cross-domain dependencies (e.g. `session_service` takes `story_repository`/`task_repository`; `story_service`/`task_service` take `session_service` back for the reverse reference-cleanup direction). |
| `container/mcp_dependencies.py` | MCP-side dependency providers | One `provide_<domain>_service` async context manager per domain | The MCP equivalent of FastAPI's `Depends`/`Provide`; each opens and closes its own `db_session`. |

## app/mcp/ — MCP server instance

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `mcp/server.py` | Single MCP server instance | `mcp_server_v1` | Every domain's `mcp_tools.py` registers onto it via `@mcp_server_v1.tool()`; mounted at `/mcp/v1` over HTTP Streamable transport. |

## app/api/ — REST route assembly

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `api/routes.py` | Path segment constants | `ApiVersion` (`V1`), `AppPath` (one entry per top-level URL segment) | A new domain adds one `AppPath` entry; single source for path strings. |
| `api/router.py` | Route mounting | `v1_router`, `app_router` | Mounts every domain router (including nested attachment/comment/link routers) under `/v1`; inline comments explain non-obvious mounts (e.g. task routes split across `stories`/`tasks` prefixes). |

## Root-level (`app/`)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `config.py` | App configuration | `Settings`, `settings` | `database_url`, `attachments_dir`, `cors_allowed_origins` (space-separated or JSON-array env string via `parse_cors_origins`), `app_title`, `app_version`. |
| `main.py` | FastAPI app assembly | `application` / `app`, `mcp_app_v1` | Wires the DI container across every domain package (also triggers `@mcp_server_v1.tool()` registration via import), configures CORS, registers `domain_error_handler`, mounts `app_router` and the MCP sub-app at `/mcp/v1`. `mcp_app_v1 = mcp_server_v1.http_app(path="/", ...)` — `path="/"` is required or FastMCP's own default internal path (`/mcp`) stacks on the mount prefix, serving at `/mcp/v1/mcp` instead (STORY-011). `FastAPI(lifespan=mcp_app_v1.lifespan, ...)` is required too, or the MCP sub-app's session manager task group never starts and every MCP HTTP request fails (STORY-011). |
| `exc_handlers.py` | Domain error → HTTP mapping | `domain_error_handler` | Maps every `DomainError` to `{error, code, details}`; `INTERNAL_ERROR` is logged server-side but never leaks its message to the client. |

---

## app/projects/ — Projects domain

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Project` | Name unique, case-insensitive; description. |
| `schema.py` | Request/response shapes | `CreateProject`, `UpdateProject`, `Project`, `PaginationMeta`, `WorkStateTask`, `WorkStateStory`, `ProjectWorkState` | `ProjectWorkState` is the cross-domain work-state aggregate shape. |
| `repository.py` | Data access | `ProjectRepository` (`get_by_name_lower`, `list_paginated`, `get_name_conflict`) | |
| `service.py` | Business logic | `ProjectService` (`create`, `get`, `list_paginated`, `update`, `delete`, `get_work_state`, `_assert_name_unique`) | `get_work_state` aggregates over stories+tasks via `StoryReaderProtocol`/`TaskReaderProtocol`. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_project`, `list_projects`, `get_project`, `get_project_work_state`, `update_project`, `delete_project` | Identical pair on both surfaces. |
| `tests/test_projects.py` | Integration tests | — | Covers both surfaces. |

## app/stories/ — Stories domain

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Story` | Belongs to a project, optional milestone; `status`/`labels`. |
| `schema.py` | Request/response shapes | `Label`, `CreateStory`, `UpdateStory`, `Story`, `StoryDetail`, `PaginationMeta`, `StoryAggregate` | `StoryDetail` adds links/attachments/comments; `StoryAggregate` is story + its tasks for the Task Manager board. |
| `repository.py` | Data access | `StoryRepository` (`coerce_project_id`, `get_by_id_and_project`, `list_paginated`, `list_all_for_project`, `list_paginated_by_milestone`) | |
| `service.py` | Business logic | `StoryService` (`create`, `get`, `get_by_id`, `list_paginated`, `update`, `get_detail`, `delete`, `get_aggregate`) | Cross-domain via `MilestoneRepositoryProtocol`, `TaskCounterProtocol`, `StoryLinkReaderProtocol`, plus injected `attachment_reader`/`comment_reader`/`session_reference_cleaner` (cascades delete, nulls session `linked_story_id`). |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_story`, `list_stories`, `get_story`, `update_story`, `delete_story`, `get_story_detail`, `get_story_aggregate` | |
| `tests/test_stories.py` | Integration tests | — | Covers both surfaces. |

## app/tasks/ — Tasks domain

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Task` | Belongs to a story; `type`/`status`/`assignee_role`/`creator_role`/`labels`. |
| `schema.py` | Request/response shapes | `Label`, `CreateTask`, `UpdateTask`, `Task`, `TaskDetail`, `PaginationMeta` | |
| `repository.py` | Data access | `TaskRepository` (`coerce_story_id`, `get_by_id_and_story`, `list_paginated`, `list_all_for_stories`, `get_status_counts_for_stories`, `get_status_counts`, `get_total_count`) | |
| `service.py` | Business logic | `TaskService` (+ `TaskLinkReaderProtocol`) (`create`, `get_by_id`, `get_detail`, `list_paginated`, `update`, `delete`) | `_assert_type_valid`/`_assert_status_valid`/`_assert_role_valid` check effective per-project dictionaries; cascades attachments/comments/task-links, nulls session `linked_task_id` on delete. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_task`, `list_tasks`, `get_task`, `get_task_detail`, `update_task`, `delete_task` | |
| `tests/test_tasks.py` | Integration tests | — | Covers both surfaces. |

## app/milestones/ — Milestones domain

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Milestone` | Belongs to a project; `status` (Planned/Active/Finished); name unique per project. |
| `schema.py` | Request/response shapes | `CreateMilestone`, `UpdateMilestone`, `Milestone`, `MilestoneDetail`, `PaginationMeta` | |
| `repository.py` | Data access | `MilestoneRepository` (`coerce_project_id`/`coerce_milestone_id`, `get_name_conflict`, `get_active_for_project`, `list_paginated`, `get_story_counts`/`get_story_count`, `clear_story_links`) | At most one Active milestone per project, atomically demoted on a new activation; `clear_story_links` nulls `milestone_id` on assigned stories when deleted. |
| `service.py` | Business logic | `MilestoneService` (`create`, `get`, `get_with_story_count`, `list_paginated`, `update`, `get_detail`, `delete`, `activate`, `finish`, `list_stories`) | Takes `attachment_reader`/`comment_reader` Protocols for cascade delete + detail composition. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_milestone`, `list_milestones`, `get_milestone`, `update_milestone`, `delete_milestone`, `activate_milestone`, `finish_milestone`, `get_milestone_detail`, `list_milestone_stories` | |
| `tests/test_milestones.py` | Integration tests | — | Covers both surfaces. |

## app/story_links/ — Story-to-story links

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `StoryLink` | Directed link between two stories, typed by `link_type` (project's `link_types` dictionary). |
| `schema.py` | Request/response shapes | `LinkedStorySummary`, `CreateStoryLink`, `StoryLink`, `EnrichedStoryLink`, `PaginationMeta` | `EnrichedStoryLink` adds the resolved linked-story summary. |
| `repository.py` | Data access | `StoryLinkRepository` (`coerce_story_id`, `find_duplicate`, `list_for_story`, `get_linked_story_summaries`, `delete_all_for_story`, `list_all_for_story`) | |
| `service.py` | Business logic | `StoryLinkService` (`create`, `get_by_id`, `list_for_story`, `delete`, `list_all_enriched_for_story`, `delete_all_for_story`, `_enrich_links`, `_assert_link_type_valid`) | `list_all_enriched_for_story`/`delete_all_for_story` are the `StoryLinkReaderProtocol` `StoryService` depends on. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_story_link`, `list_story_links`, `delete_story_link` | Two routers: `story_links_router` (nested `/stories/:storyId/links`) and `story_links_top_router` (`/story-links/:id`). |
| `tests/test_story_links.py` | Integration tests | — | Covers both surfaces. |

## app/task_links/ — Task-to-task links

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `TaskLink` | Directed link between two tasks, typed by `link_type`. |
| `schema.py` | Request/response shapes | `LinkedTaskSummary`, `CreateTaskLink`, `TaskLink`, `EnrichedTaskLink`, `PaginationMeta` | |
| `repository.py` | Data access | `TaskLinkRepository` (`coerce_task_id`, `find_duplicate`, `list_for_task`, `get_linked_task_summaries`, `delete_all_for_task`, `list_all_for_task`) | |
| `service.py` | Business logic | `TaskLinkService` (`create`, `get_by_id`, `list_for_task`, `delete`, `list_all_enriched_for_task`, `delete_all_for_task`, `_enrich_links`, `_resolve_project_id_for_story`, `_assert_link_type_valid`) | `list_all_enriched_for_task`/`delete_all_for_task` are the `TaskLinkReaderProtocol` `TaskService` depends on. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_task_link`, `list_task_links`, `delete_task_link` | Two routers: `task_links_router` (nested `/tasks/:taskId/links`) and `task_links_top_router` (`/task-links/:id`). |
| `tests/test_task_links.py` | Integration tests | — | Covers both surfaces. |

## app/attachments/ — Attachments domain

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Attachment` | Polymorphic container (`story`/`task`/`milestone`) x kind (`document`/`external_ref`/`stored_file`); `file_path` server-internal only. Create/delete only — no update, no archive. |
| `schema.py` | Request/response shapes | `CreateDocumentAttachmentText`/`Json`, `CreateExternalRefAttachment`/`Json`, `CreateStoredFileAttachmentForm`, `CreateBase64FileAttachment`, `AttachmentCreateInput`, `Attachment`, `PaginationMeta` | `AttachmentCreateInput` is the discriminated union across all create shapes. |
| `repository.py` | Data access | `AttachmentRepository` (`coerce_container_id`, `list_paginated`, `list_all_for_container`, `delete_all_for_container`) | |
| `service.py` | Business logic | `AttachmentService` (+ `StoryReaderProtocol`/`TaskReaderProtocol`/`MilestoneReaderProtocol`) (`create`, `get_by_id`, `get_file`, `get_file_base64`, `list_paginated`, `delete`, `list_all_for_container`, `delete_all_for_container`, `_assert_size_allowed`/`_assert_mime_allowed`/`_assert_url_valid`/`_build_relative_path`) | `list_all_for_container`/`delete_all_for_container` are the `AttachmentReaderProtocol` the three container services depend on. |
| `controller.py` | REST surface | `_build_create_input*` (JSON vs multipart parsing), `create_*_attachment`/`list_*_attachments` per container type, `get_attachment`, `get_attachment_file`, `delete_attachment` | |
| `mcp_tools.py` | MCP surface | `create_document_attachment`, `create_external_ref_attachment`, `create_file_attachment` (base64), `list_attachments`, `get_attachment`, `get_attachment_file`, `delete_attachment` | MCP has no REST equivalent for base64 create/read. |
| `tests/test_attachments.py`, `tests/test_attachment_title_migration.py` | Integration tests | — | Second file covers the title-length migration specifically. |

## app/comments/ — Comments domain

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Comment` | Polymorphic container (`story`/`task`/`milestone`); `author_role`, `content`, `labels`, threaded via a parent reference. |
| `schema.py` | Request/response shapes | `Label`, `CreateComment`, `UpdateComment`, `Comment`, `PaginationMeta` | |
| `repository.py` | Data access | `CommentRepository` (`coerce_container_id`/`coerce_comment_id`, `list_paginated`, `list_by_ids`, `list_all_for_container`, `delete_all_for_container`) | `list_by_ids` backs ancestor resolution for permalinks. |
| `service.py` | Business logic | `CommentService` (`get_by_id`, `update`, `delete`, `list_all_for_container`, `delete_all_for_container`, `_assert_container_type_valid`/`_resolve_container`/`_assert_content_valid`/`_assert_author_role_not_empty`) | `list_all_for_container`/`delete_all_for_container` are the `CommentReaderProtocol` the three container services depend on. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `_create_comment`/`_list_comments` shared helpers, `create_*_comment`/`list_*_comments` per container type, `get_comment`, `get_comment_ancestors`, `update_comment`, `delete_comment` | `get_comment_ancestors` backs permalink navigation. |
| `tests/test_comments.py` | Integration tests | — | Covers both surfaces. |

## app/sessions/ — Sessions domain (STORY-009; delete added STORY-008/TASK-009)

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM model | `Session` | Belongs to a project; `topic`/`goal`/`participant_role`, three-way `status` (`pending`/`in-progress`/`finished`), independent optional `linked_story_id`/`linked_task_id`, `archived_at` (reversible archive toggle, independent of delete). |
| `schema.py` | Request/response shapes | `CreateSession`, `UpdateSession`, `Session`, `PaginationMeta`, `ALL_SESSION_STATUSES` | |
| `repository.py` | Data access | `SessionRepository` (`coerce_project_id`/`coerce_story_id`/`coerce_task_id`, `list_paginated`, `clear_linked_story`/`clear_linked_task`) | `clear_linked_story`/`clear_linked_task` back the reverse-direction reference cleanup called from `StoryService`/`TaskService` delete. |
| `service.py` | Business logic | `SessionService` (+ `StoryReaderProtocol`/`TaskReaderProtocol`/`SessionReferenceCleanerProtocol`) (`create`, `get_by_id`, `list_paginated`, `update`, `archive`, `delete`, `clear_references_to_story`/`clear_references_to_task`) | `delete` (STORY-008/TASK-009) is hard row removal via `BaseRepository.delete` with no `archived_at`/`status` guard — REST/MCP deletion is unrestricted; the archived-only restriction is Web-UI-only, enforced by the frontend stack, not here. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `create_session`, `list_sessions`, `get_session`, `update_session`, `archive_session`, `delete_session` | `delete_session`: REST `DELETE /{session_id}` → `204`; MCP → `{"success": true}`. |
| `tests/test_sessions.py`, `tests/test_session_status_backfill_migration.py` | Integration tests | `TestDeleteSession` class | `TestDeleteSession` (STORY-008/TASK-009) covers both surfaces across archived/non-archived, all three statuses, linked story/task survival, repeat delete, unknown/malformed id. |

## app/settings/ — System + Project settings

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `model.py` | ORM models | `SystemSettings`, `ProjectSettings` | Global dictionaries vs. per-project overrides of the same keys. |
| `schema.py` | Request/response shapes | `LinkTypeEntry`, `UpdateSettingsBody`, `SettingsResponse`, `SettingsOverridesResponse` | |
| `repository.py` | Data access | `SystemSettingsRepository` (`get_by_key`), `ProjectSettingsRepository` (`assert_project_exists`, `get_all_for_project`, `get_by_project_and_key`) | |
| `service.py` | Business logic | `SettingsService` (implements `EffectiveDictionary` Protocol) (`get_system_settings`/`update_system_settings`, `get_project_settings`/`update_project_settings`/`clear_project_setting`, `resolve`/`resolve_all`/`get_effective_settings`, `_validate_plain_values`/`_validate_default_web_ui_role`/`_validate_link_types`) | `EffectiveDictionary` is the Protocol every other domain's `_assert_*_valid` consumes; `resolve_all`/`get_effective_settings` do override-over-system merge. |
| `controller.py` | REST surface | `get_system_settings`, `update_system_settings`, `get_project_settings`, `get_effective_project_settings`, `update_project_settings` | Spans `/system/settings` and `/projects/{id}/settings` — no single domain prefix; router included unprefixed in `api/router.py`. |
| `mcp_tools.py` | MCP surface | `get_system_settings`, `set_system_settings`, `get_project_effective_settings`, `set_project_settings`, `clear_project_setting` | |
| `tests/test_settings.py`, `tests/test_link_types_structured.py` | Integration tests | — | |

## app/status/ — Health/status endpoint

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `schema.py` | Response shape | `Status` | |
| `service.py` | Business logic | `StatusService` (`get_status`) | Reads only the running `app_version` from config; no repository, probes no dependency. |
| `controller.py` / `mcp_tools.py` | REST/MCP surfaces | `get_status` | |
| `tests/test_status.py` | Integration tests | — | |

---

## migrations/ — Alembic revisions

| Module/File | Purpose | Notes |
|---|---|---|
| `migrations/versions/` | One file per revision, `NNNN_<description>.py` | Latest: `0014_session_status_backfill.py`. Never edited in place once applied — a stale shape is corrected by a new revision that detects it structurally. |
| `migrations/env.py` | Alembic runtime config | Dialect-agnostic; same scripts run on SQLite and PostgreSQL. |

## tests/ — integration test modules

One `test_<domain>.py` per domain package (listed inline in each domain's table above), exercising
REST and MCP through the same assertions via `tests/conftest.py`'s `client` fixture / `_mcp_call`
helper. `tests/unit/` (STORY-013) holds isolated, non-HTTP tests; everything else is integration-level through the two surfaces.

| Module/File | Purpose | Notes |
|---|---|---|
| `conftest.py` | Shared fixtures: `engine`, `client`, `_mcp_call` | The `engine` fixture's `connect` listener `_enable_foreign_keys` issues `PRAGMA foreign_keys=ON` on every test-engine connection (STORY-015), so declared FK actions (cascade/SET NULL) are enforced in tests. Test engine only — the application engine (`core/database/engine.py`) does not set it. |
| `unit/test_types.py` | Unit tests for `UTCDateTime` (STORY-013) | `TestUTCDateTimeResultValue`, `TestUTCDateTimeBindParam`; first file in the `tests/unit/` package. The create-vs-read offset regression lives in `test_stories.py` (`TestGetStory::test_read_keeps_utc_offset_on_created_and_updated_at`; `TestCreateStoryMcpParity` compares `created_at`/`updated_at`). |
| `test_mcp_mount.py` | Verifies the MCP server's actual HTTP mount (STORY-011) | The only MCP test that goes over the wire: boots a real Uvicorn server + real `fastmcp.Client` (streamable-HTTP) against `app.main.application`, so it exercises `application.mount(...)` and the ASGI lifespan protocol. Every other MCP test uses `_mcp_call`/`fastmcp.Client(mcp_server_v1)` in-process and never touches the mount or lifespan. |

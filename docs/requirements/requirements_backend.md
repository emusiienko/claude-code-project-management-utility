# Backend Requirements

## Assumptions

The following assumptions were made where the validated idea or conceptual document left decisions open:

1. **Deployment** — Docker-based; the utility runs via Docker Compose on the developer's machine. Ports are mapped to localhost only — not exposed publicly. The database provider and storage technology are architecture decisions left to the architect; the product constraint is that the full stack runs on a single developer machine with no external cloud dependencies.
2. **Web UI scope for V1** — full CRUD for all entities and modules (confirmed in validated idea: "full CRUD access for the human orchestrator").
3. **Labels structure** — labels are an ordered array of `{key: string, value: string}` objects; `key` is always required; all keys are free-form.
4. **Session status** — free-form string, not dictionary-validated (conceptual doc: "свободная метка" — free label).
5. **Story statuses dictionary** — added as settings key `story_statuses`; the dedicated `status` field on Story is validated against this dictionary.
6. **Attachment file storage** — all attachment content (both `document` and `image` kinds) is stored on the server filesystem, not as text in the database. This makes attached artifacts (plans, architecture docs, implementation reports) directly accessible as files on disk. The database stores metadata and a server-internal file path only. For AI agents (MCP), document content is submitted as UTF-8 text in the request body and the server writes it to a file. For the Web UI, file upload via multipart/form-data is also supported.
7. **Authentication** — none; this is a single-developer personal tool. Docker port mapping to localhost is the access boundary — no auth layer required.

---

## Feature List

| Feature | Description | Priority |
|---------|-------------|----------|
| Project Management | CRUD for projects — the top-level namespace for all work items | P0 |
| Stories | Top-level work containers within a project; dedicated `status` field (dictionary-validated); free-form labels; on-demand aggregated task state | P0 |
| Tasks | Atomic work items within a story; `type`, `status`, `assignee_role`, `creator_role` from per-project dictionaries; validated at write | P0 |
| Settings Module | Configurable value dictionaries per project (task statuses, task types, story statuses, attachment types, link types, participant roles); system defaults; project-level overrides | P0 |
| MCP Server | Full MCP protocol access surface exposing all operations for AI agents | P0 |
| Work Item Linking | Typed directed links between tasks (`task_links`) and between stories (`story_links`); same semantic model — typed, directed, same-project-only, passive; detail endpoints return enriched link lists with id, title, and status of the linked item | P1 |
| Attachments | Document attachments (Markdown/text files, stored on filesystem, with change history, archivable) and image attachments (binary files on filesystem, archivable) and external-reference attachments (URL + status, detachable) attached to stories or tasks | P1 |
| Comments | Author + text notes attached to stories or tasks; support labels | P1 |
| Sessions Module | Session records with start artifact, optional result artifact, status label, optional cross-module link; find incomplete sessions | P1 |
| Milestones | Named planning markers scoped to exactly one project; each milestone has a lifecycle status (`planned` / `active` / `finished`); at most one milestone per project may be `active` at a time (activate action demotes the previous one atomically); stories are optionally assigned to a milestone via nullable FK; `story_count` is server-derived | P1 |
| Cross-project Queries | List stories and tasks across all projects in a single query; project-scoped is the default | P2 |

---

## Data Model

### Project <!-- updated: 2026-07-06 (STORY-003 reconcile) -->

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| name | string | Yes | 1–200 chars; unique across all projects (case-insensitive); whitespace-only names rejected | |
| description | text | No | max 5,000 chars | |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

---

### Story <!-- updated: 2026-07-07 (STORY-004 reconcile) -->

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| project_id | UUID | Yes | FK → Project; CASCADE DELETE; immutable | |
| title | string | Yes | 1–500 chars | |
| content | text | No | max 50,000 chars | Markdown |
| status | string | No | from project's `story_statuses` dictionary if provided; null allowed | e.g. "planned", "in-progress", "accepted" |
| labels | JSON array | No | array of `{key: string, value: string}`; all keys free-form | arbitrary metadata; status is NOT stored here |
| milestone_id | UUID | No | FK → Milestone; ON DELETE SET NULL; nullable; story's project must match milestone's project | FK constraint added by migration `0004_milestone` (STORY-012) |
| created_at | timestamp | Yes | set on create | timezone-aware |
| updated_at | timestamp | Yes | set on update | timezone-aware |

**Computed (not stored):** `aggregate_state` — computed on demand from task statuses; see `GET /stories/:id/aggregate`.

---

### Task

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| story_id | UUID | Yes | FK → Story; immutable | |
| title | string | Yes | 1–500 chars | |
| content | text | No | max 50,000 chars | Markdown |
| type | string | Yes | from project's `task_types` dictionary | e.g. "task", "bug", "testing-task" |
| status | string | Yes | from project's `task_statuses` dictionary | e.g. "todo", "in-progress", "done" |
| assignee_role | string | No | from project's `participant_roles` dictionary if provided | single assignee — atomicity by design |
| creator_role | string | No | from project's `participant_roles` dictionary if provided | role that created this task; optional |
| labels | JSON array | No | array of `{key: string, value: string}`; all keys free-form | |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

---

### TaskLink

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| source_task_id | UUID | Yes | FK → Task | |
| target_task_id | UUID | Yes | FK → Task; must differ from source_task_id | |
| link_type | string | Yes | from the parent story's project's `link_types` dictionary | e.g. "depends-on", "context" |
| created_at | timestamp | Yes | set on create | |

Unique constraint: (source_task_id, target_task_id, link_type).

---

### StoryLink

Typed directed links between stories in the same project. Same semantic model as TaskLink.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| source_story_id | UUID | Yes | FK → Story; CASCADE DELETE | |
| target_story_id | UUID | Yes | FK → Story; CASCADE DELETE; must differ from source_story_id | |
| link_type | string | Yes | from source story's project's `link_types` dictionary | e.g. "depends-on", "context" |
| created_at | timestamp | Yes | set on create | |

Unique constraint: (source_story_id, target_story_id, link_type).

---

### Attachment

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| container_type | enum | Yes | "story" \| "task"; immutable | |
| container_id | UUID | Yes | FK → Story or Task (per container_type); immutable | |
| type | string | Yes | from container's project's `attachment_types` dictionary | |
| kind | enum | Yes | "document" \| "image" \| "external-ref"; immutable | |
| mime_type | string | Cond. | required when kind = "document" or "image"; e.g. "text/markdown", "text/plain", "image/png" | stored; used as Content-Type when serving the file |
| file_size_bytes | integer | Cond. | required when kind = "document" or "image"; set on upload/creation | |
| archived_at | timestamp | No | null = active; non-null = archived; "document" and "image" kinds only | once archived, file content is immutable |
| external_url | string | Cond. | required when kind = "external-ref"; max 2,000 chars; valid URI | |
| external_status | string | No | free-form; max 200 chars; "external-ref" kind only | user-defined state of the referenced artifact; e.g. "open", "merged", "deployed". Semantic meaning is caller-defined; the utility stores it without interpretation. |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

**File storage:** for `kind = "document"` and `kind = "image"`, the file content is stored on the server filesystem. A server-internal `file_path` is maintained but never exposed in API responses.

---

### AttachmentVersion

Stores the change history of `document`-kind attachments. Each version is a file snapshot on the server filesystem. Read-only once written.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| attachment_id | UUID | Yes | FK → Attachment (document kind only) | |
| file_size_bytes | integer | Yes | size of the snapshot file | |
| author_role | string | No | who made the change; free-form | |
| created_at | timestamp | Yes | version timestamp | |

A new row and a new snapshot file are written on every document content update. `AttachmentVersion` does not apply to `image` or `external-ref` kinds.

---

### Comment

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| container_type | enum | Yes | "story" \| "task" | |
| container_id | UUID | Yes | FK → Story or Task (per container_type) | |
| author_role | string | No | free-form | |
| content | text | Yes | 1–50,000 chars; Markdown | |
| labels | JSON array | No | array of `{key: string, value: string}`; all keys free-form | e.g. key="requires-action" |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

Comments cannot be attached to Attachments — only to Stories and Tasks.

---

### Session

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| topic | string | Yes | 1–500 chars | start artifact: session topic |
| context | text | No | max 50,000 chars | start artifact: context/background |
| result_decisions | text | No | max 50,000 chars; null until set | result artifact: decisions made |
| result_summary | text | No | max 50,000 chars; null until set | result artifact: summary |
| status | string | No | free-form string; max 100 chars | not dictionary-validated |
| participant_role | string | No | free-form; the agent or role involved | |
| linked_story_id | UUID | No | FK → Story; SET NULL on Story delete | optional cross-module reference |
| linked_task_id | UUID | No | FK → Task; SET NULL on Task delete | optional cross-module reference |
| archived_at | timestamp | No | null = active; non-null = archived | |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

A session with both `result_decisions` and `result_summary` null is considered **incomplete** (the session was started but never closed).

Sessions do not belong to a project. A project may be mentioned in `topic` or `context`, but `project_id` is not a field.

---

### SystemSettings

One row per dictionary key. Pre-seeded at install time; updatable.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| key | string | Yes | PK; one of the six keys below | |
| values | JSON array | Yes | array of non-empty strings; min 1 item | |
| updated_at | timestamp | Yes | set on update | |

**Pre-seeded system defaults:**

| key | default values |
|-----|----------------|
| task_statuses | `["todo", "in-progress", "done"]` |
| task_types | `["task", "bug", "testing-task"]` |
| story_statuses | `["planned", "in-progress", "pending-approval", "accepted"]` |
| attachment_types | `["plan", "document", "image", "implementation-report", "test-result", "external-ref"]` |
| link_types | `["depends-on", "context"]` |
| participant_roles | `["orchestrator", "architect", "backend-developer", "frontend-developer", "devops", "spec-writer", "qa-automation", "manual-qa"]` |

---

### ProjectSettings

One row per (project, key) pair. Absent rows fall through to system defaults.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| project_id | UUID | Yes | FK → Project; composite PK (project_id, key) | |
| key | string | Yes | same six keys as SystemSettings; composite PK | |
| values | JSON array | Yes | array of non-empty strings; min 1 item | completely replaces (does not merge with) the system default for that key |
| updated_at | timestamp | Yes | set on update | |

**Effective dictionary resolution:** for each key, if a ProjectSettings row exists for `(project_id, key)`, its `values` is used; otherwise the SystemSettings row for that `key` is used.

---

### Milestone <!-- updated: 2026-07-11 (STORY-012 reconcile) -->

A milestone is scoped to exactly one project (single-project model — the M:N design was replaced before implementation; see ADR-013). A project may have many milestones; a milestone belongs to one project.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| project_id | UUID | Yes | FK → Project; CASCADE DELETE; immutable after create | |
| name | string | Yes | 1–200 chars; unique within project case-insensitively | enforced via functional index on `LOWER(name)` scoped to `project_id` |
| description | text | No | max 5,000 chars | |
| status | string | Yes | one of `"planned"`, `"active"`, `"finished"`; server default `"planned"` | at most one milestone per project may be `"active"` at a time |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

**story.milestone_id** — nullable FK column (already existed as a bare column since STORY-004; FK constraint added by migration `0004_milestone`):

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| milestone_id | UUID | No | FK → Milestone; ON DELETE SET NULL | story's project must match the milestone's project |

**story_count** — computed, not stored. Derived at read time as the count of stories whose `milestone_id` equals the milestone's id. Present on both list items and detail responses. List resolves all counts in a single batched GROUP BY query (no N+1).

---

### Relationships

| Relationship | Cardinality | On Delete |
|---|---|---|
| Project → Story | 1:N | CASCADE |
| Story → Task | 1:N | CASCADE |
| Story → Attachment (container_type = story) | 1:N | CASCADE |
| Story → Comment (container_type = story) | 1:N | CASCADE |
| Task → Attachment (container_type = task) | 1:N | CASCADE |
| Task → Comment (container_type = task) | 1:N | CASCADE |
| Task → TaskLink (source or target) | 1:N | CASCADE (link deleted when either task is deleted) |
| Story → StoryLink (source or target) | 1:N | CASCADE (link deleted when either story is deleted) |
| Attachment (document) → AttachmentVersion | 1:N | CASCADE |
| Project → ProjectSettings | 1:N | CASCADE |
| Session → Story (linked_story_id) | N:0-1 | SET NULL |
| Session → Task (linked_task_id) | N:0-1 | SET NULL |
| Project → Milestone | 1:N | CASCADE (all project milestones deleted when project deleted) |
| Story → Milestone (milestone_id) | N:0-1 | SET NULL (story's milestone_id cleared when milestone deleted) |

---

### Indexes

| Entity | Index fields | Justification |
|--------|-------------|---------------|
| Story | (project_id, created_at DESC) | list stories by project, paginated |
| Story | (project_id, status) | filter stories by status within a project |
| Task | (story_id, status) | list tasks by story, filter by status |
| Task | (story_id, type) | filter tasks by type |
| Task | (assignee_role) | cross-project filter by assignee |
| Task | (creator_role) | cross-project filter by creator |
| TaskLink | (source_task_id, link_type) | outbound links per task |
| TaskLink | (target_task_id, link_type) | inbound links per task (for blocked computation) |
| StoryLink | (source_story_id, link_type) | outbound links per story |
| StoryLink | (target_story_id, link_type) | inbound links per story |
| Attachment | (container_type, container_id, type, archived_at) | attachments per container filtered by type and active/archived |
| AttachmentVersion | (attachment_id, created_at DESC) | history of a document attachment |
| Comment | (container_type, container_id, created_at ASC) | comment thread per container |
| Session | (archived_at, result_decisions) | find incomplete sessions (WHERE result_decisions IS NULL AND archived_at IS NULL) |
| Session | (linked_story_id) | sessions for a story |
| Session | (linked_task_id) | sessions for a task |
| Story | (milestone_id) | stories assigned to a milestone |
| Milestone | (project_id) | milestones for a project |
| Milestone | (project_id, status) | find active milestone for a project |
| Milestone | (project_id, LOWER(name)) unique | case-insensitive name uniqueness within a project |

---

## API Specification

**Auth:** none on all endpoints (local personal tool; no roles or access control by design).
**Rate limit:** 1,000 req/min on all endpoints.
**Pagination:** all list endpoints accept `page` (default: 1) and `limit` (default: 20, max: 100); all list responses return:
```json
{ "data": [...], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 } }
```

**Standard error shape:**
```json
{ "error": "Human-readable message.", "code": "ERROR_CODE", "details": [ { "field": "name", "message": "..." } ] }
```
`details` is omitted when not applicable.

---

### Projects <!-- updated: 2026-07-06 (STORY-003 reconcile) -->

> **As-built notes (STORY-003):**
> - Invalid UUID path params (`:id`) return 404, not 422 — consistent across all project endpoints.
> - The `delete_project` MCP tool returns `{"success": true}` (MCP tools must return a value; void return is not valid in the MCP tool schema).
> - Passing `null` for `description` in `PUT /projects/:id` is a no-op (field not cleared); an explicit description clear is not supported.

#### POST /projects
- **Auth:** none
- **Rate limit:** 1,000 req/min
- **Request body:**
  ```json
  { "name": "string (required, 1–200 chars)", "description": "string (optional, max 5000 chars)" }
  ```
- **Response 201:** `{ "data": { Project } }`
- **Response errors:**
  - 422: name missing or out of range (Pydantic field validation)
  - 409: name already taken → `{ "error": "A project with this name already exists.", "code": "CONFLICT" }`
  - 500: unexpected → log full stack; `{ "error": "An unexpected error occurred. Please try again.", "code": "INTERNAL_ERROR" }`

#### GET /projects
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`
- **Response 200:** paginated Project list

#### GET /projects/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Project } }`
- **Response errors:** 404

#### PUT /projects/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `name`, `description` — all optional; only provided fields updated
- **Response 200:** `{ "data": { Project } }`
- **Response errors:** 404, 409, 422 (field out of range — Pydantic)

#### DELETE /projects/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204:** no body
- **Response errors:** 404

---

### Stories <!-- updated: 2026-07-07 (STORY-004 reconcile) -->

> **As-built notes (STORY-004):**
> - Invalid UUID path params (`:projectId`, `:id`) return 404, not 422 — consistent with the projects domain (ADR-011).
> - The REST controller uses a single `APIRouter` mounted at `/v1/stories`. All story routes (POST, GET list, GET by id, PUT, DELETE) are served under the `/v1/stories` prefix; the `/projects` prefix was removed before acceptance.
> - `PUT /stories/:id` omitting `status` in the request body leaves the current status **unchanged**. To explicitly remove a previously-set status, send `"status": null`. This applies to `content` as well.
> - `PUT /stories/:id` omitting `labels` in the request body leaves the current labels **unchanged**. Sending `"labels": []` clears all labels (valid).
> - The `delete_story` MCP tool returns `{"success": true}` (MCP tools must return a value; void return is not valid in the MCP tool schema).
> - `GET /stories/:id/aggregate` is implemented — see the Tasks section for as-built notes (STORY-005).

#### POST /projects/:projectId/stories
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:**
  ```json
  {
    "title": "string (required, 1–500 chars)",
    "content": "string (optional)",
    "status": "string (optional, from story_statuses dict)",
    "labels": [ { "key": "string", "value": "string" } ]
  }
  ```
- **Response 201:** `{ "data": { Story } }`
- **Response errors:**
  - 404: project not found
  - 422: title missing or out of range; label missing `key` (Pydantic field validation); `status` not in `story_statuses` dict → `{ "error": "Status value '{v}' is not allowed. Allowed: {list}.", "code": "UNPROCESSABLE" }`

#### GET /projects/:projectId/stories
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `status`, `label_key`, `label_value`
- **Response 200:** paginated Story list
- **Response errors:** 404 (project)

#### GET /stories/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Story } }`
- **Response errors:** 404

#### PUT /stories/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `title`, `content`, `status`, `labels` — all optional; `labels` fully replaces existing when provided
- **Response 200:** `{ "data": { Story } }`
- **Response errors:** 404, 422 (field out of range or label missing key — Pydantic; status not in dict — business)

#### DELETE /stories/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204**
- **Response errors:** 404

#### GET /stories/:id/aggregate <!-- updated: 2026-07-12 (STORY-005 reconcile) -->
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  { "data": { "story_id": "uuid", "total_tasks": 5, "by_status": { "todo": 2, "in-progress": 1, "done": 2 } } }
  ```
  Computed on demand — never stored. A story with no tasks returns `{ "total_tasks": 0, "by_status": {} }` — HTTP 200, not an error.
- **Response errors:** 404

> **As-built notes (STORY-005):** Implemented via `TaskCounterProtocol` injected into `StoryService`. The protocol is duck-typed against `TaskRepository.get_status_counts(story_id)` — the stories service never imports the concrete task service. `total_tasks` is computed as `sum(by_status.values())` to avoid a second DB round-trip. The `get_story_aggregate` MCP tool mirrors the REST endpoint exactly. Container declaration order: `task_repository` must be declared before `story_service` in `AppContainer` because Python evaluates class-body assignments in order.

#### GET /stories/:id/detail <!-- updated: 2026-07-02 (STORY-001 reconcile); updated: 2026-07-13 (STORY-006: links added) -->

> **As-built notes (STORY-006):**
> - The route was added in STORY-006 TASK-003 alongside the `StoryDetail` schema (`StoryDetail(Story)` Pydantic model in `stories/schema.py`). The endpoint is registered in `stories/controller.py` before the existing `/aggregate` route, and mirrored as the `get_story_detail` MCP tool.
> - `links` is populated by `StoryService.get_detail` via the injected `StoryLinkReaderProtocol`; returns `[]` when the reader is not wired.
> - **BUG-001 fix (2026-07-13):** `LinkedStorySummary.status` is declared `str | None` (nullable). The original spec described `status` as a string; however `story.status` is nullable, causing a 500 when any linked story has no status. The fix is a one-line type change in `story_links/schema.py`. All enriched story-link responses must tolerate `null` in the `status` field.

- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  {
    "data": {
      "...all Story fields...",
      "links": [
        {
          "id": "uuid",
          "direction": "outbound | inbound",
          "link_type": "string",
          "linked_story": { "id": "uuid", "title": "string", "status": "string | null" }
        }
      ],
      "attachments": [ active Attachment objects ],
      "comments": [ Comment objects ordered by created_at ASC ]
    }
  }
  ```
  Composite read — story entity plus its outbound and inbound story links (enriched with `id`, `title`, and nullable `status` of the linked story), active attachments, and comments. Large child collections (tasks) are excluded and served by their own paginated endpoint.
- **Response errors:** 404

---

### Tasks <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

> **As-built notes (STORY-005):**
> - Invalid UUID path params (`:storyId`, `:id`) return 404 (string→UUID coercion via ADR-011 — consistent with projects and stories domains).
> - The controller uses two separate routers: `stories_router` for `POST /stories/{story_id}/tasks` and `GET /stories/{story_id}/tasks`; `tasks_router` for `GET/PUT/DELETE /tasks/{task_id}` and `GET /tasks/{task_id}/detail`.
> - `PUT /tasks/:id` omitting `assignee_role` or `creator_role` leaves the current value unchanged. Sending `null` clears the field (always allowed — not dictionary-validated when clearing). The `"field" in data.model_fields_set` guard ensures null-clearing and omission remain distinct.
> - `PUT /tasks/:id` with `story_id` in the body is silently ignored (`UpdateTask` schema does not declare it). The owning story never changes.
> - `GET /tasks/:id/detail` `links` field is populated by STORY-006 (TASK-003) via the injected `TaskLinkReaderProtocol`; `attachments` and `comments` remain `[]` pending STORY-007 and STORY-008.
> - The `delete_task` MCP tool (and all task MCP tools) return appropriate values; the MCP protocol does not support void returns.
> - Cascade delete (`task ON DELETE CASCADE`) is implemented in migration `0005_task` at the DB schema level. SQLite WAL mode requires `PRAGMA foreign_keys = ON` at connection time to enforce FK cascade; the conftest engine setup does not yet set this pragma — the cascade test is marked `xfail(strict=True)` pending that fix.

#### POST /stories/:storyId/tasks
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:**
  ```json
  {
    "title": "string (required, 1–500 chars)",
    "content": "string (optional)",
    "type": "string (required, from task_types dict)",
    "status": "string (required, from task_statuses dict)",
    "assignee_role": "string (optional, from participant_roles dict)",
    "creator_role": "string (optional, from participant_roles dict)",
    "labels": [ { "key": "string", "value": "string" } ]
  }
  ```
- **Response 201:** `{ "data": { Task } }`
- **Response errors:**
  - 404: story not found
  - 422: missing required fields or values out of range (Pydantic); any dict field not in dictionary → `{ "error": "Value '{v}' is not allowed for field '{field}'. Allowed: {list}.", "code": "UNPROCESSABLE" }`

#### GET /stories/:storyId/tasks
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `status`, `type`, `assignee_role`, `creator_role`
- **Response 200:** paginated Task list
- **Response errors:** 404 (story)

#### GET /tasks/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Task } }`
- **Response errors:** 404

#### GET /tasks/:id/detail
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  {
    "data": {
      "...all Task fields...",
      "links": [ TaskLink objects enriched with linked task id/title/status ],
      "attachments": [ active Attachment objects ],
      "comments": [ Comment objects ordered by created_at ASC ]
    }
  }
  ```
- **Response errors:** 404

#### PUT /tasks/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `title`, `content`, `type`, `status`, `assignee_role`, `creator_role`, `labels` — all optional; `story_id` immutable
- **Response 200:** `{ "data": { Task } }`
- **Response errors:** 404, 422 (field out of range — Pydantic; dict value not in dictionary — business)

#### DELETE /tasks/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204**
- **Response errors:** 404

#### GET /tasks/:id/dependencies
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  { "data": { "task_id": "uuid", "inbound_depends_on": [ { "task_id": "uuid", "task_title": "string", "task_status": "in-progress" } ] } }
  ```
- **Response errors:** 404

---

### Task Links <!-- updated: 2026-07-13 (STORY-006 reconcile) -->

> **As-built notes (STORY-006):**
> - `task_link` table created in migration `0006_task_link`. Two separate packages (`task_links`, `story_links`) — not a polymorphic table (see ADR-017/018).
> - Cascade delete is handled **application-side** via `TaskLinkReaderProtocol` injected into `TaskService.delete`. FK `ON DELETE CASCADE` clauses retained as defence-in-depth for PostgreSQL.
> - Enrichment is batched (one query per direction over the counterpart id set). `LinkedTaskSummary.status` is declared `str` (story `status` is optional — task `status` is always required, so this is safe for task links).
> - The controller uses two routers: `task_links_router` (POST/GET `/tasks/:taskId/links`) and `task_links_top_router` (DELETE `/task-links/:id`).
> - MCP tools (`create_task_link`, `list_task_links`, `delete_task_link`) mirror the REST surface.

#### POST /tasks/:taskId/links
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `{ "target_task_id": "uuid (required)", "link_type": "string (required, from link_types dict)" }`
- **Response 201:** `{ "data": { TaskLink } }`
- **Response errors:**
  - 404: source or target not found
  - 409: duplicate link
  - 422: missing fields (Pydantic); link_type not in dict; source = target; tasks from different stories → `{ "error": "Linked tasks must belong to the same story.", "code": "UNPROCESSABLE" }`

#### GET /tasks/:taskId/links
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `direction` (outbound \| inbound \| both; default: both), `link_type`
- **Response 200:** paginated TaskLink list enriched with linked task `id`, `title`, `status`
- **Response errors:** 404

#### DELETE /task-links/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204**
- **Response errors:** 404

---

### Story Links <!-- updated: 2026-07-13 (STORY-006 reconcile) -->

> **As-built notes (STORY-006):**
> - Same semantic model as `task_links` — two separate domain packages; not a polymorphic table. `story_link` table created in migration `0007_story_link`.
> - Cascade delete is handled **application-side** via `StoryLinkReaderProtocol` injected into `StoryService.delete`. FK `ON DELETE CASCADE` clauses retained as defence-in-depth for PostgreSQL.
> - Enrichment is batched (one query per direction over the counterpart id set). `LinkedStorySummary.status` is declared `str | None` (nullable) — BUG-001 fix.
> - MCP tools (`create_story_link`, `list_story_links`, `delete_story_link`) mirror the REST surface.

#### POST /stories/:storyId/links
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `{ "target_story_id": "uuid (required)", "link_type": "string (required, from link_types dict)" }`
- **Response 201:** `{ "data": { StoryLink } }`
- **Response errors:**
  - 404: source or target story not found
  - 409: duplicate link → `{ "error": "This link already exists.", "code": "CONFLICT" }`
  - 422: missing fields (Pydantic); link_type not in dict → `{ "error": "Value '{v}' is not in link_types.", "code": "UNPROCESSABLE" }`; source = target → `{ "error": "A story cannot link to itself.", "code": "UNPROCESSABLE" }`; stories from different projects → `{ "error": "Linked stories must belong to the same project.", "code": "UNPROCESSABLE" }`

#### GET /stories/:storyId/links
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `direction` (outbound \| inbound \| both; default: both), `link_type`
- **Response 200:** paginated StoryLink list enriched with linked story `id`, `title`, `status`
- **Response errors:** 404

#### DELETE /story-links/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204**
- **Response errors:** 404

---

### Attachments

Attachments of `kind = "document"` or `kind = "image"` are stored as files on the server filesystem. The create endpoint accepts either `application/json` (for programmatic/MCP use) or `multipart/form-data` (for file uploads from the Web UI).

#### POST /stories/:storyId/attachments
#### POST /tasks/:taskId/attachments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **`kind = document` via JSON:** `{ "type", "kind": "document", "content": "string", "mime_type": "text/markdown|text/plain", "author_role" }`
- **`kind = document` or `kind = image` via multipart:** fields `type`, `kind`, `mime_type`, `author_role` + `file` binary
- **`kind = external-ref` via JSON:** `{ "type", "kind": "external-ref", "external_url": "string", "external_status" }`
- **Response 201:** `{ "data": { Attachment } }`
- **Response errors:**
  - 400: file > 10 MB; unsupported MIME type; external_url is not a valid URI (non-Pydantic business checks)
  - 404: container not found
  - 422: required fields missing (Pydantic); type not in dict

#### GET /stories/:storyId/attachments
#### GET /tasks/:taskId/attachments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `type`, `kind`, `include_archived` (bool, default: false)
- **Response 200:** paginated Attachment list
- **Response errors:** 404

#### GET /attachments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Attachment } }` (metadata only)
- **Response errors:** 404

#### GET /attachments/:id/file
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** raw file with `Content-Type` matching `mime_type`
- **Response errors:**
  - 400: `kind = external-ref` → `{ "error": "External reference attachments do not have a stored file.", "code": "VALIDATION_ERROR" }`
  - 404

#### PUT /attachments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **`kind = document` via JSON:** `{ "content": "string", "author_role" }` — creates new AttachmentVersion
- **`kind = document` via multipart:** `file` + optional `author_role` — same effect
- **`kind = external-ref`:** `{ "external_url", "external_status" }`
- **`kind = image`:** not updatable → 400
- **Response 200:** `{ "data": { Attachment } }`
- **Response errors:** 400 (archived; image kind), 404

#### GET /attachments/:id/history
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit` (ordered by created_at DESC)
- **Response 200:** paginated AttachmentVersion list
- **Response errors:** 400 (not a document), 404

#### GET /attachment-versions/:id/file
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** raw file content of that version snapshot
- **Response errors:** 404

#### POST /attachments/:id/archive
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Attachment } }` with `archived_at` set
- **Response errors:** 400 (already archived; external-ref kind), 404

#### DELETE /attachments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** only `kind = external-ref`; document and image are archived, never deleted
- **Response 204**
- **Response errors:** 400 (document or image kind), 404

---

### Comments

#### POST /stories/:storyId/comments
#### POST /tasks/:taskId/comments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `{ "content": "string (required, 1–50000 chars)", "author_role", "labels": [...] }`
- **Response 201:** `{ "data": { Comment } }`
- **Response errors:** 404 (container), 422 (content missing or out of range — Pydantic)

#### GET /stories/:storyId/comments
#### GET /tasks/:taskId/comments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `label_key`, `label_value`
- **Response 200:** paginated Comment list ordered by created_at ASC
- **Response errors:** 404

#### GET /comments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Comment } }`
- **Response errors:** 404

#### PUT /comments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `content`, `labels` — optional; `labels` fully replaces when provided
- **Response 200:** `{ "data": { Comment } }`
- **Response errors:** 404, 422 (content out of range — Pydantic)

#### DELETE /comments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204**
- **Response errors:** 404

---

### Sessions

#### POST /sessions
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `{ "topic": "string (required, 1–500 chars)", "context", "status", "participant_role", "linked_story_id", "linked_task_id" }`
- **Response 201:** `{ "data": { Session } }` — result fields null on creation
- **Response errors:** 404 (linked IDs), 422 (topic missing or out of range — Pydantic)

#### GET /sessions
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `incomplete` (bool), `status`, `include_archived` (bool, default: false)
- **Response 200:** paginated Session list

#### GET /sessions/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Session } }`
- **Response errors:** 404

#### PUT /sessions/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `status`, `context`, `result_decisions`, `result_summary`, `participant_role`, `linked_story_id`, `linked_task_id` — all optional
- **Response 200:** `{ "data": { Session } }`
- **Response errors:** 400 (attempt to update immutable `topic` field), 404 (session or linked IDs not found), 422 (field value out of range — Pydantic)

#### POST /sessions/:id/archive
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Session } }` with `archived_at` set
- **Response errors:** 400 (already archived), 404

---

### Settings <!-- updated: 2026-06-30 (STORY-002 reconcile) -->

#### GET /system/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { task_statuses, task_types, story_statuses, attachment_types, link_types, participant_roles } }`

#### PUT /system/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** partial — only provided keys updated
- **Response 200:** `{ "data": { all system settings } }`
- **Response errors:** 400 (unknown key; empty values array)

#### GET /projects/:projectId/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** project-level overrides only; `{}` if none set
- **Response errors:** 404

#### GET /projects/:projectId/settings/effective
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** merged effective dictionaries for all six keys
- **Response errors:** 404

#### PUT /projects/:projectId/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** partial settings object
- **Response 200:** `{ "data": { effective settings after update } }`
- **Response errors:** 400 (unknown key; empty values), 404

#### DELETE /projects/:projectId/settings/:key *(not yet implemented — see Known Gaps)*
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** removes the project-level override for the given key; effective value reverts to system default; other keys' overrides are unaffected; clearing a key with no override is a no-op
- **Response 204:** no body
- **Response errors:** 404 (project not found or key not a valid dictionary key)
- **Status:** the backend service implements `clear_project_setting`; no REST route or MCP tool exposes it as of STORY-002; the frontend calls this endpoint and receives an error at runtime

---

### Milestones <!-- updated: 2026-07-11 (STORY-012 reconcile) -->

> **As-built notes (STORY-012):** The previously planned M:N (milestone ↔ project) model was replaced with a single-project model before implementation. Each milestone carries a `project_id` FK (not a join table). A `status` lifecycle field was added (`planned` / `active` / `finished`). Lifecycle transitions are exposed as action endpoints (POST activate / POST finish), not via PUT. `story_count` is a server-derived field present on both list and detail responses. `container_type = "milestone"` for attachments/comments was deferred — not implemented in STORY-012.

#### POST /milestones
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:**
  ```json
  { "name": "string (required, 1–200 chars)", "project_id": "uuid (required)", "description": "string (optional)" }
  ```
- **Response 201:** `{ "data": { Milestone } }`
- **Response errors:**
  - 404: project not found
  - 409: name already exists within that project → `{ "error": "A milestone named '{name}' already exists in this project.", "code": "CONFLICT" }`
  - 422: name missing or out of range; project_id missing (Pydantic field validation)

#### GET /milestones
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `project_id` (filter by owning project)
- **Response 200:** paginated Milestone list; each item includes `project_id`, `status`, and `story_count`

#### GET /milestones/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Milestone + story_count } }`
- **Response errors:** 404

#### PUT /milestones/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `name`, `description` — optional; `project_id` is immutable after create
- **Response 200:** `{ "data": { Milestone } }`
- **Response errors:**
  - 404: milestone not found
  - 409: name conflict within the same project
  - 422: name out of range (Pydantic)

#### DELETE /milestones/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** sets `milestone_id = null` on all assigned stories; no story is deleted
- **Response 204**
- **Response errors:** 404

#### POST /milestones/:id/activate
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** sets the milestone's status to `active`. If another milestone in the same project is currently `active`, it is demoted to `planned` in the same transaction — the project never has two active milestones. Idempotent (already-active → no-op success). Valid from any prior status (`planned` or `finished`).
- **Response 200:** `{ "data": { Milestone } }` with `status: "active"`
- **Response errors:** 404

#### POST /milestones/:id/finish
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** sets status to `finished`. No side effect on other milestones. Idempotent.
- **Response 200:** `{ "data": { Milestone } }` with `status: "finished"`
- **Response errors:** 404

#### GET /milestones/:id/stories
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`
- **Response 200:** paginated Story list assigned to this milestone
- **Response errors:** 404

#### Story list — milestone filter (extension to existing GET /projects/:projectId/stories)
The story list endpoint accepts an optional `milestone_id` query parameter. An unknown or malformed `milestone_id` yields an empty page (not an error).

---

### Cross-project Queries

#### GET /stories
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `project_id`, `status`, `label_key`, `label_value`
- **Response 200:** paginated Story list across all projects; each story includes `project_id`

#### GET /tasks
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `project_id`, `story_id`, `status`, `type`, `assignee_role`, `creator_role`
- **Response 200:** paginated Task list; each task includes `story_id` and derived `project_id`

---

## Validation Rules

### Field-Level

| Entity | Field | Rule | Error Message |
|--------|-------|------|---------------|
| Project | name | Required; 1–200 chars; unique (case-insensitive); whitespace-only rejected | "Project name is required and must be between 1 and 200 characters." / "A project with this name already exists." |
| Story | title | Required; 1–500 chars | "Story title is required." |
| Story | status | Optional; if provided, in `story_statuses` dict | "Status value '{v}' is not allowed. Allowed: {list}." |
| Story | labels[].key | Non-empty string | "Each label must have a non-empty key." |
| Task | title | Required; 1–500 chars | "Task title is required." |
| Task | type | Required; in `task_types` dict | "Task type '{v}' is not allowed. Allowed: {list}." |
| Task | status | Required; in `task_statuses` dict | "Task status '{v}' is not allowed. Allowed: {list}." |
| Task | assignee_role | Optional; if set, in `participant_roles` dict | "Role '{v}' is not in the allowed list: {list}." |
| Task | creator_role | Optional; if set, in `participant_roles` dict | "Role '{v}' is not in the allowed list: {list}." |
| TaskLink | link_type | Required; in `link_types` dict | "Link type '{v}' is not allowed. Allowed: {list}." |
| TaskLink | target_task_id | Must differ from source | "A task cannot link to itself." |
| TaskLink | target_task_id | Must share the same `story_id` as source | "Linked tasks must belong to the same story." |
| TaskLink | (source, target, type) | Unique | "This link already exists." |
| Attachment | type | Required; in `attachment_types` dict | "Attachment type '{v}' is not allowed. Allowed: {list}." |
| Attachment | kind | Required; one of the three enum values | "Attachment kind must be 'document', 'image', or 'external-ref'." |
| Attachment | content / file | Required when kind = document | "Content is required for document attachments." |
| Attachment | mime_type | Required when kind = document or image; allowed values per kind | "MIME type '{v}' is not supported for {kind} attachments." |
| Attachment | external_url | Required when kind = external-ref; valid URI | "A valid URL is required for external reference attachments." |
| Comment | content | Required; 1–50,000 chars | "Comment content is required." |
| Session | topic | Required; 1–500 chars | "Session topic is required." |
| SystemSettings / ProjectSettings | values | Array; min 1 non-empty string | "Dictionary values cannot be empty." |
| Milestone | name | Required; 1–200 chars; unique within the milestone's project (case-insensitive) | "A milestone named '{name}' already exists in this project." |
| Milestone | project_id | Required; must be an existing project UUID | "Project not found." (404) |
| Story | milestone_id | Optional; if set, milestone must exist (404) and belong to the story's project (422) | "This milestone does not belong to the story's project." |

### Business-Level

1. A task's project is determined transitively via `task.story_id → story.project_id`. All dictionary lookups use that project's effective settings.
2. Document and image attachments (`kind = "document"` or `kind = "image"`) are archived, never deleted.
3. An archived document attachment cannot have its content updated. Image attachments cannot be updated at all — archive and re-create.
4. Deleting a Project cascades to Stories → Tasks → Attachments → AttachmentVersions → Comments → TaskLinks → ProjectSettings. Sessions linked to deleted Stories or Tasks have links set to null.
5. `GET /stories/:id/aggregate` is always computed on demand; never stored.
6. `GET /tasks/:id/dependencies` returns raw data only — the utility never enforces blocking.
7. A session where both `result_decisions` and `result_summary` are null is incomplete.
8. ProjectSettings for a given key completely replace (not merge with) the system default.
9. A session without a linked story or task is valid.
10. `AttachmentVersion` records exist only for `kind = "document"` attachments.
11. TaskLinks can only be created between tasks that share the same `story_id`. Both `source_task_id` and `target_task_id` must belong to the same parent story; cross-story task links are rejected (422).
12. A project can have at most one milestone with status `active` at a time. Activating a milestone when another is already `active` demotes the previous one to `planned` in the same database transaction.
13. Deleting a milestone sets `milestone_id` to null on all assigned stories; the stories themselves are not deleted. Deleting a project cascades to all its milestones.

---

## Error Handling

| Error Code | HTTP Status | User-Facing Message | Log Level | Notes |
|------------|-------------|---------------------|-----------|-------|
| VALIDATION_ERROR | 400 | "Validation failed: {details}" | DEBUG | Non-Pydantic bad-request errors: business-logic checks, unparseable JSON, immutable field update attempts |
| NOT_FOUND | 404 | "{Resource} not found." | DEBUG | |
| CONFLICT | 409 | Specific message per case | DEBUG | Name uniqueness, duplicate link |
| UNPROCESSABLE | 422 | "Invalid value: {field} — {reason}" | DEBUG | Pydantic field validation errors (missing required fields, values out of range); dictionary violations |
| INTERNAL_ERROR | 500 | "An unexpected error occurred. Please try again." | ERROR | Stack logged server-side only |

Standard error shape:
```json
{ "error": "...", "code": "ERROR_CODE", "details": [ { "field": "...", "message": "..." } ] }
```

---

## Known Gaps <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

The following requirements are **partially implemented** as of STORY-002. They are retained as requirements but noted so future stories can close the gap.

### Clear project-settings override (partial)

**Requirement:** A project override for a specific key can be cleared, restoring the system default for that key without affecting other keys.

**What is implemented:**
- The backend `SettingsService` has a fully functional `clear_project_setting(project_id, key)` method that deletes the `(project_id, key)` row and returns the post-clear effective settings.
- Clearing a key with no override is a no-op (already returns system default).
- The frontend `ProjectSettings` screen includes a "Clear override" button that calls `DELETE /v1/projects/:projectId/settings/:key`.

**What is missing:**
- No REST route exposes `clear_project_setting` — the Settings controller has zero `DELETE` routes.
- No MCP tool exposes `clear_project_setting`.
- The v1.0 LOCKED contract does not include `DELETE /projects/:projectId/settings/:key`. The `PUT` endpoint cannot clear (empty list is rejected with "Dictionary values cannot be empty.").

**Net effect:** the UI "Clear override" button fails at runtime with a 404/405. There is no contract-blessed path for agents or the UI to clear an override.

**Resolution path:** contract revision to add `DELETE /projects/:projectId/settings/:key → 204 | 404`, a backend REST route, and an MCP tool — wiring the existing service method. See `docs/architecture.md` § Known Divergences.

### SQLite FK cascade enforcement (partial)

**Requirement:** When a story is deleted all its tasks must be permanently removed; no orphan task records may remain.

**What is implemented:**
- Migration `0005_task` declares `task.story_id` with `ON DELETE CASCADE` in the SQLite schema.
- The cascade works correctly under PostgreSQL (the opt-in dialect).

**What is missing:**
- The test conftest engine setup does not issue `PRAGMA foreign_keys = ON` at connection time. Without this pragma, SQLite does not enforce FK constraints, so cascade deletes are not exercised in the automated test suite.
- `TestTaskCascadeDelete` and the equivalent `TestCascadeDelete` for stories are both marked `xfail(strict=True)` pending this fix.

**Resolution path:** add `PRAGMA foreign_keys = ON` to the conftest SQLite engine setup; remove the `xfail` markers from both cascade tests. Assign to `backend-developer`.

---

## Non-Functional Requirements

### Performance
- CRUD endpoints (single-resource): p95 < 200 ms
- List endpoints (up to 1,000 records): p95 < 500 ms
- `GET /stories/:id/aggregate` (up to 500 tasks): < 300 ms
- `GET /tasks/:id/detail` (up to 100 attachments + 200 comments): < 500 ms
- Concurrent load: ≥ 5 simultaneous requests without degradation

### Security
- All services run inside Docker containers; ports are mapped to `localhost` only via Docker Compose — not exposed to the network
- No authentication or authorisation by deliberate design principle — Docker port mapping is the access boundary
- All inputs sanitised before persistence
- Uploaded files stored in a server-managed directory (Docker volume) outside the web root; file paths never constructed from user input

### Accessibility
- Not applicable to the backend API layer — see [Web UI Requirements](requirements_web.md)

### Browser & Device Support
- Not applicable to the backend API layer — see [Web UI Requirements](requirements_web.md)

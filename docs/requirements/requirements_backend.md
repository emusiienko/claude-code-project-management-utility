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
| Task Links | Typed directed links between tasks; on-demand computation of inbound dependency data | P1 |
| Attachments | Document attachments (Markdown/text files, stored on filesystem, with change history, archivable) and image attachments (binary files on filesystem, archivable) and external-reference attachments (URL + status, detachable) attached to stories or tasks | P1 |
| Comments | Author + text notes attached to stories or tasks; support labels | P1 |
| Sessions Module | Session records with start artifact, optional result artifact, status label, optional cross-module link; find incomplete sessions | P1 |
| Milestones | Named planning markers associated with one or more projects; stories are optionally assigned to a milestone (nullable FK); each milestone has its own description, attachments, and comments | P1 |
| Cross-project Queries | List stories and tasks across all projects in a single query; project-scoped is the default | P2 |

---

## Data Model

### Project

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| name | string | Yes | 1–200 chars; unique across all projects | |
| description | text | No | max 5,000 chars | |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

---

### Story

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| project_id | UUID | Yes | FK → Project; immutable | |
| title | string | Yes | 1–500 chars | |
| content | text | No | max 50,000 chars | Markdown |
| status | string | No | from project's `story_statuses` dictionary if provided; null allowed | e.g. "planned", "in-progress", "accepted" |
| labels | JSON array | No | array of `{key: string, value: string}`; all keys free-form | arbitrary metadata; status is NOT stored here |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

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
| link_type | string | Yes | from source task's project's `link_types` dictionary | e.g. "depends-on", "context" |
| created_at | timestamp | Yes | set on create | |

Unique constraint: (source_task_id, target_task_id, link_type).

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

### Milestone

Top-level entity — not bound to a single project. A milestone is associated with one or more projects via a join table.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| name | string | Yes | 1–200 chars; unique within each associated project (enforced at write time) | |
| description | text | No | max 5,000 chars | |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

**MilestoneProject** (join table — M:N between Milestone and Project):

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| milestone_id | UUID | Yes | FK → Milestone; composite PK |
| project_id | UUID | Yes | FK → Project; composite PK |

**Story.milestone_id** (nullable FK added to Story entity):

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| milestone_id | UUID | No | FK → Milestone; SET NULL on milestone delete | Story's project must be in Milestone's associated projects |

Milestones share the same attachment and comment mechanism as Stories and Tasks (container_type = `"milestone"`).

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
| Attachment (document) → AttachmentVersion | 1:N | CASCADE |
| Project → ProjectSettings | 1:N | CASCADE |
| Session → Story (linked_story_id) | N:0-1 | SET NULL |
| Session → Task (linked_task_id) | N:0-1 | SET NULL |
| Milestone ↔ Project (MilestoneProject join) | M:N | CASCADE (join row deleted when either side is deleted) |
| Story → Milestone (milestone_id) | N:0-1 | SET NULL |
| Milestone → Attachment (container_type = milestone) | 1:N | CASCADE |
| Milestone → Comment (container_type = milestone) | 1:N | CASCADE |

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
| Attachment | (container_type, container_id, type, archived_at) | attachments per container filtered by type and active/archived |
| AttachmentVersion | (attachment_id, created_at DESC) | history of a document attachment |
| Comment | (container_type, container_id, created_at ASC) | comment thread per container |
| Session | (archived_at, result_decisions) | find incomplete sessions (WHERE result_decisions IS NULL AND archived_at IS NULL) |
| Session | (linked_story_id) | sessions for a story |
| Session | (linked_task_id) | sessions for a task |
| Story | (milestone_id) | stories assigned to a milestone |
| MilestoneProject | (milestone_id) | projects for a milestone |
| MilestoneProject | (project_id) | milestones for a project |

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

### Projects

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

### Stories

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

#### GET /stories/:id/aggregate
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  { "data": { "story_id": "uuid", "total_tasks": 5, "by_status": { "todo": 2, "in-progress": 1, "done": 2 } } }
  ```
  Computed on demand — never stored.
- **Response errors:** 404

#### GET /stories/:id/detail <!-- updated: 2026-07-02 (STORY-001 reconcile) -->
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  {
    "data": {
      "...all Story fields...",
      "attachments": [ active Attachment objects ],
      "comments": [ Comment objects ordered by created_at ASC ]
    }
  }
  ```
  Composite read — story entity plus its active attachments and comments. Large child collections (tasks) are excluded and served by their own paginated endpoint.
- **Response errors:** 404

---

### Tasks

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

### Task Links

#### POST /tasks/:taskId/links
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `{ "target_task_id": "uuid (required)", "link_type": "string (required, from link_types dict)" }`
- **Response 201:** `{ "data": { TaskLink } }`
- **Response errors:**
  - 404: source or target not found
  - 409: duplicate link
  - 422: missing fields (Pydantic); link_type not in dict; source = target

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

### Milestones

#### POST /milestones
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `{ "name": "string (required)", "project_ids": ["uuid (required, min 1)"], "description": "string (optional)" }`
- **Response 201:** `{ "data": { Milestone } }`
- **Response errors:**
  - 404: any project_id not found
  - 409: name already exists within one of the associated projects
  - 422: name missing or out of range; project_ids missing or empty (Pydantic field validation)

#### GET /milestones
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `project_id` (filter by associated project)
- **Response 200:** paginated Milestone list; each item includes `project_ids` array and `story_count`

#### GET /milestones/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Milestone + project_ids } }`
- **Response errors:** 404

#### PUT /milestones/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `name`, `description`, `project_ids` — all optional; `project_ids` replaces the full set of associated projects
- **Response 200:** `{ "data": { Milestone } }`
- **Response errors:**
  - 404: milestone or any project_id not found
  - 409: name conflict within associated projects
  - 422: empty project_ids array (Pydantic); removing a project that still has stories assigned to this milestone (business)

#### DELETE /milestones/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 204**
- **Response errors:** 404

#### GET /milestones/:id/detail <!-- updated: 2026-07-02 (STORY-001 reconcile) -->
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  {
    "data": {
      "...all Milestone fields...",
      "project_ids": ["uuid"],
      "attachments": [ active Attachment objects ],
      "comments": [ Comment objects ordered by created_at ASC ]
    }
  }
  ```
  Composite read — milestone entity plus its active attachments and comments. The list of assigned stories is excluded and served by `GET /milestones/:id/stories`.
- **Response errors:** 404

#### GET /milestones/:id/stories
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`
- **Response 200:** paginated Story list assigned to this milestone; each story includes `project_id`
- **Response errors:** 404

Milestones also support attachment and comment endpoints using the same patterns as stories and tasks, with `container_type = "milestone"`:
- `POST /milestones/:id/attachments`, `GET /milestones/:id/attachments`
- `POST /milestones/:id/comments`, `GET /milestones/:id/comments`

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
| Project | name | Required; 1–200 chars; unique | "Project name is required and must be between 1 and 200 characters." / "A project with this name already exists." |
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
| TaskLink | (source, target, type) | Unique | "This link already exists." |
| Attachment | type | Required; in `attachment_types` dict | "Attachment type '{v}' is not allowed. Allowed: {list}." |
| Attachment | kind | Required; one of the three enum values | "Attachment kind must be 'document', 'image', or 'external-ref'." |
| Attachment | content / file | Required when kind = document | "Content is required for document attachments." |
| Attachment | mime_type | Required when kind = document or image; allowed values per kind | "MIME type '{v}' is not supported for {kind} attachments." |
| Attachment | external_url | Required when kind = external-ref; valid URI | "A valid URL is required for external reference attachments." |
| Comment | content | Required; 1–50,000 chars | "Comment content is required." |
| Session | topic | Required; 1–500 chars | "Session topic is required." |
| SystemSettings / ProjectSettings | values | Array; min 1 non-empty string | "Dictionary values cannot be empty." |
| Milestone | name | Required; 1–200 chars; unique within each associated project | "A milestone named '{name}' already exists in project '{project}'." |
| Milestone | project_ids | Required; min 1 valid project UUID | "At least one project must be associated with a milestone." |
| Story | milestone_id | Optional; if set, story's project must be in milestone's project set | "Story's project is not associated with this milestone." |

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
11. TaskLinks can only be created between tasks in the same project.
12. Removing a project from a milestone's `project_ids` while stories from that project are still assigned to the milestone is rejected — the story assignments must be cleared first.
13. Deleting a milestone sets `milestone_id` to null on all assigned stories; the stories themselves are not deleted.

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

## Known Gaps <!-- updated: 2026-06-30 (STORY-002 reconcile) -->

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

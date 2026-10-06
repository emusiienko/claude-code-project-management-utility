# API Contract: Coordination Service

This document is the contract — every consumer of the coordination service must honor it exactly.

The coordination service is a single backend application that exposes **two behavior-identical surfaces over one shared service layer**:

- **REST API** — every route below is relative to the **versioned base path `/v1`**, i.e. the full URL is
  `http://<host>:<port>/v1<path>` (e.g. `GET /stories` → `http://localhost:8000/v1/stories`). The `/v1`
  prefix is omitted from the endpoint headings throughout, never from the wire. OpenAPI docs are served
  at `/v1/docs`, the schema at `/v1/openapi.json`.
  - **Trailing-slash quirk (as-built).** The `projects` collection is the one route pair declared with a
    trailing slash (`/v1/projects/`); every other collection is declared without one (`/v1/stories`).
    A request to `/v1/projects` therefore gets a `307` redirect, and a client that does not re-send the
    body on redirect silently drops a `POST` payload. Clients must call `/v1/projects/` directly. This
    is an as-built inconsistency, not an intended contract feature — see the
    [SAD](../sad.md)'s Risks & Technical Debt.
- **MCP server** — the same operations exposed as tools over HTTP streamable transport. MCP is **not a separate port**: it is path-mounted on the same backend app that serves REST (same container, same port). MCP clients connect at exactly `http://<host>:<port>/mcp/v1`, i.e. `http://localhost:8000/mcp/v1` on the prod stack (`:8100` on the dev stack). No other MCP path is served. MCP tool names mirror the REST endpoints 1-to-1 (e.g. `create_task`, `list_stories`, `get_task_detail`); request and response payloads use the same schemas defined here. Domain errors map to MCP tool errors with the same `code`.

Each endpoint group below names its MCP tools. REST and MCP are behavior-identical, including error codes. The only inherent transport differences are noted where they occur (e.g. lenient REST query strings vs. strict MCP RPC kwargs; binary crosses MCP only as base64).

## Versioning & status

**This contract is LOCKED.** It was locked at **v1.0** and has evolved through a sequence of architect-approved revisions to its current as-built head, **v1.12**. Shapes are not changed without an architect-approved revision.

**Surface versioning.** Both surfaces are path-versioned, and this document is version `v1` of both. REST lives under the `/v1` base path. MCP lives under `/mcp/<version>`, one MCP server instance per version, so `v1` is served at `/mcp/v1` (ADR-032). A breaking change to either surface ships as a new path version beside the old one, never in place. The `v1.N` revision numbers below track this document's evolution within `v1`. They are not wire versions.

The revisions folded into this document are:

- **v1.1** — Stories list/create move to a single `/stories` base path; `project_id` becomes a body field (POST) and required query param (GET list).
- **v1.2** — A milestone belongs to exactly one project and carries a lifecycle status (`planned` → `active` → `finished`); activate/finish action endpoints; `Story.milestone_id`.
- **v1.3** — Task-link scope narrowed from project to same-story; Story Links surface added; `StoryDetail.links`.
- **v1.4** — `link_types` dictionary entries are structured `{value, outbound, inbound}`; the other four dictionary keys remain `string[]`.
- **v1.5** — Attachments as built: one immutable file per attachment (no `PUT` update), create + delete only (no archive), new `file` kind, `author_role` on the entity, MCP base64 create/read.
- **v1.6** — Attachment `title` (mandatory, free-form 1–500) replaces the retired dictionary-bound `type`; `attachment_types` dictionary retired (six keys → five); attachment list `type` filter removed.
- **v1.7** — Work Item Comments built for story/task/milestone (`author_role` required + immutable; persisted materialized `ancestors` reply path; newest-first lists; lineage endpoint); Settings gains scalar `default_web_ui_role`.
- **v1.8** — Sessions as built: project-scoped, required `goal`, fixed 3-value `status` enum, two independent optional links.
- **v1.9** — Additive service `Status` read and project `work-state` breadth read, each mirrored 1-to-1 on REST + MCP.
- **v1.10** — *As-built correction; no running behavior changed.* Deletes documentation of reads the
  system never had, so the contract describes only what exists. Records the `/v1` base path and the
  `projects` trailing-slash quirk explicitly, neither of which the contract had stated.
- **v1.11** — Permanent session deletion as built, on both surfaces, following the existing
  single-resource delete pattern. Accepted for any session regardless of `archived_at` or `status`:
  the archived-only restriction the Web UI applies is a UI-side affordance only and is deliberately
  absent from this contract.
- **v1.12** — *As-built correction; no tool name, payload, or error code changed.* States the MCP
  address as the literal `/mcp/v1` instead of the example `/mcp`, and states MCP path versioning
  (`/mcp/<version>`, one server instance per version) explicitly, per ADR-032. Before the mount fix
  this revision records, the only MCP route was `/mcp/v1/mcp`, and it failed every request, so no
  working client depended on any address. That route is gone and now returns `404`.

## Auth (applies to every endpoint)

**None — localhost-only, no auth by design.** No login, roles, or RBAC on any endpoint. The only access boundary is Docker localhost port mapping (see the Authentication Flow subsection of the [Solution Overview](../solution-overview/solution-overview.md)). This applies to **all** endpoints below; it is not restated per-endpoint. Rate limit: 1,000 req/min on every endpoint. All `*_role` fields are descriptive metadata, never access control.

## Shared shapes

The **error envelope** is defined once in the Error Handling Strategy subsection of the [Solution Overview](../solution-overview/solution-overview.md) and referenced from every endpoint's Errors field below, never restated. Its shape and the pagination shape are:

```typescript
// Standard success envelope (single resource)
interface Envelope<T> { data: T; }

// Standard list envelope (all list endpoints)
interface ListEnvelope<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

// Standard error shape (details omitted when not applicable)
interface ApiError {
  error: string;                                  // human-readable
  code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "UNPROCESSABLE" | "INTERNAL_ERROR";
  details?: { field: string; message: string; }[];
}

// Common pagination query params on every list endpoint
interface Pagination { page?: number; /* default 1 */ limit?: number; /* default 20, max 100 */ }

// Free-form label
interface Label { key: string; value: string; }   // key required & non-empty
```

**HTTP status conventions:** `201` create, `200` read/update, `204` delete (no body), `404` not found, `409` conflict, `500` internal.

**422 vs 400 (important):**
- `422 VALIDATION_ERROR` — request-schema (Pydantic) validation of body or query params; carries `details[]` field errors.
- `422 UNPROCESSABLE` — dictionary / business-rule violation (allowed-value, association, etc.).
- `400 VALIDATION_ERROR` — non-schema bad request: immutable-field edits, unparseable JSON, upload business rules (size / MIME), invalid-state operations.

Request-body/query-param schema validation returns **422**; `400` is reserved for bad-request errors that are not schema violations.

## Entities

```typescript
interface Project {
  id: string;                // UUID
  name: string;              // 1–200, unique (case-insensitive)
  description: string | null;// max 5000
  created_at: string;        // ISO 8601
  updated_at: string;
}

interface Story {
  id: string;
  project_id: string;
  title: string;             // 1–500
  content: string | null;    // max 50000, Markdown
  status: string | null;     // from project's effective story_statuses
  labels: Label[];
  milestone_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  story_id: string;
  title: string;             // 1–500
  content: string | null;    // max 50000, Markdown
  type: string;              // from task_types
  status: string;            // from task_statuses
  assignee_role: string | null;  // from participant_roles
  creator_role: string | null;   // from participant_roles
  labels: Label[];
  created_at: string;
  updated_at: string;
}

interface TaskLink {
  id: string;
  source_task_id: string;
  target_task_id: string;
  link_type: string;         // from link_types
  created_at: string;
}

// TaskLink enriched with the linked task's summary (returned by link/detail endpoints)
interface EnrichedTaskLink extends TaskLink {
  direction?: "outbound" | "inbound";
  linked_task: { id: string; title: string; status: string; };
}

interface StoryLink {
  id: string;
  source_story_id: string;
  target_story_id: string;
  link_type: string;         // from link_types
  created_at: string;
}

// StoryLink enriched with the linked story's summary (returned by link/detail endpoints)
interface EnrichedStoryLink extends StoryLink {
  direction: "outbound" | "inbound";
  linked_story: { id: string; title: string; status: string | null; };  // status is nullable
}

type AttachmentKind = "document" | "image" | "file" | "external-ref";
type ContainerType = "story" | "task" | "milestone";

interface Attachment {
  id: string;
  container_type: ContainerType;
  container_id: string;
  title: string;             // 1–500, free-form (v1.6 — replaces the retired dictionary-bound `type`)
  kind: AttachmentKind;
  mime_type: string | null;       // required when kind = document|image|file
  file_size_bytes: number | null; // required when kind = document|image|file
  external_url: string | null;    // required when kind = external-ref
  external_status: string | null; // external-ref only, free-form
  author_role: string | null;     // optional, free-form — who created it; set at create, immutable
  created_at: string;
  updated_at: string;
  // file_path is server-internal and NEVER serialized
}

interface Comment {
  id: string;
  container_type: ContainerType;  // story | task | milestone (NOT attachment)
  container_id: string;
  author_role: string;       // required, non-empty, immutable after create (v1.7)
  content: string;           // 1–50000, Markdown
  labels: Label[];
  ancestors: string[];       // ordered root-first ancestor comment ids; [] for a top-level comment (v1.7)
  created_at: string;
  updated_at: string;
}

type SessionStatus = "pending" | "in-progress" | "finished";  // fixed enum; NOT dictionary-validated

interface Session {                          // v1.8 — as built
  id: string;
  project_id: string;        // required; the owning project (session is always project-scoped)
  topic: string;             // 1–500 (mandatory, updatable, non-clearable)
  goal: string;              // 1–500 (mandatory, updatable, non-clearable) — the purpose it was created for
  context: string | null;
  status: SessionStatus;     // required, non-null; default "pending" at create (never a create input)
  participant_role: string;  // required; validated vs effective participant_roles (mandatory, non-clearable)
  result_decisions: string | null;   // informational; never affects status
  result_summary: string | null;     // informational; never affects status
  linked_story_id: string | null;    // independent optional link; same-project; nulled if the story is deleted
  linked_task_id: string | null;     // independent optional link; same-project; nulled if the task is deleted
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

type MilestoneStatus = "planned" | "active" | "finished";  // lowercase on the wire; UI capitalises

interface Milestone {
  id: string;
  name: string;              // 1–200, unique within its project
  description: string | null;
  project_id: string;        // the single owning project
  status: MilestoneStatus;   // default "planned" on create
  story_count?: number;      // included in list/detail
  created_at: string;
  updated_at: string;
}

// v1.6 — `attachment_types` retired — five dictionary keys, not six.
type DictionaryKey =
  | "task_statuses" | "task_types" | "story_statuses"
  | "link_types" | "participant_roles";

type PlainDictionaryKey = Exclude<DictionaryKey, "link_types">;

// v1.4 — link_types is the ONLY dictionary that stores structured entries. Each carries the
// machine value plus its directional display labels. The other four keys remain plain-string arrays.
interface LinkTypeEntry {
  value: string;      // machine key stored on TaskLink.link_type / StoryLink.link_type (1–200 chars)
  outbound: string;   // label shown on the SOURCE side of the relationship (1–200 chars)
  inbound: string;    // label shown on the TARGET side of the relationship (1–200 chars)
}

// Heterogeneous by key: link_types is LinkTypeEntry[], the four plain keys are string[],
// and (v1.7) default_web_ui_role is a single scalar string — the first non-list key.
interface Settings extends Record<PlainDictionaryKey, string[]> {
  link_types: LinkTypeEntry[];
  default_web_ui_role: string;   // required; the Web UI's default comment author_role
}
interface SettingsOverrides extends Partial<Record<PlainDictionaryKey, string[]>> {
  link_types?: LinkTypeEntry[];
  default_web_ui_role?: string;  // project override; scalar
}
```

**`default_web_ui_role`** (v1.7): a single-value setting living in the same `(key, values)` store as the dictionaries, resolved with the same system-default + project-override precedence (a project override fully replaces the system value). On write it must be non-empty and a member of the effective `participant_roles` for the scope — otherwise **422** with the `"Value '{v}' is not allowed. Allowed: {list}."` message. It is never re-validated on read and never constrains a comment's own free-form `author_role`; its only product effect is pre-filling the Add Comment form. System default is `"operator"` (`participant_roles` also seeds `"operator"`, the human orchestrator).

**`link_types` validation** (v1.4): each entry must be an object with all three fields (`value`, `outbound`, `inbound`), each a non-empty string 1–200 chars. Plain-string entries are rejected; duplicate `value` within one array is rejected; symmetric entries (`outbound == inbound`) are valid. Stored `TaskLink.link_type` / `StoryLink.link_type` hold only the plain `value` string; link-type validation on link creation checks against the set of `value` fields. As built: plain-string / missing-field / blank / over-length entries fail Pydantic request-schema validation → **422**; duplicate `value` and empty-list are service-layer domain `ValidationError`s → **400** (`"link_types values must be unique"` / `"Dictionary values cannot be empty."`).

---

## Projects

MCP tools: `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`, `get_project_work_state`.

### POST /projects
- **Request**: `CreateProject { name: string; description?: string; }`
- **Response**: `201 Envelope<Project>`
- **Errors**: standard envelope — `422`, `409`, `500`.
- **Example (409)**: `{ "error": "A project with this name already exists.", "code": "CONFLICT" }`

### GET /projects?page&limit
- **Response**: `200 ListEnvelope<Project>`

### GET /projects/:id
- **Response**: `200 Envelope<Project>`
- **Errors**: `404`.

### PUT /projects/:id
- **Request**: `UpdateProject { name?: string; description?: string; }`
- **Response**: `200 Envelope<Project>`
- **Errors**: `422`, `404`, `409`.

### DELETE /projects/:id
- **Response**: `204` (no body)
- **Errors**: `404`. A malformed (non-UUID) `:id` returns `404 NOT_FOUND`, not `422`.
- **Cascade**: stories → tasks → attachments/comments/links/project_settings; the project's sessions too. Sessions linked to a deleted story/task keep the session and null just that link.

### GET /projects/:id/work-state  (v1.9)
A single breadth read of the whole project tree — the project + every story + each story's tasks (core fields only) + per-story status counts, in one call. Breadth only: attachments, comments, and links are **structurally absent** from all three shapes (not merely empty); depth stays with `GET /stories/:id/detail` and `GET /tasks/:id/detail`. Composed N+1-free (4 batched queries).
- **Response**: `200 Envelope<ProjectWorkState>`
- **Errors**: `404 NOT_FOUND` (with resource type + id) for an unknown project. A zero-story project → `stories: []`; a zero-task story → `tasks: []` and `task_status_counts: {}` (none are errors).
- **Shapes**:
```typescript
interface ProjectWorkState {
  id: string; name: string; description: string | null;
  created_at: string; updated_at: string;
  stories: WorkStateStory[];
}
interface WorkStateStory {
  id: string; title: string; status: string | null; milestone_id: string | null;
  created_at: string; updated_at: string;
  tasks: WorkStateTask[];
  task_status_counts: Record<string, number>;   // {} for a story with no tasks
}
interface WorkStateTask {                        // shallow subset — no content, labels, or creator_role
  id: string; title: string; type: string; status: string;
  assignee_role: string | null; created_at: string; updated_at: string;
}
```

---

## Stories

MCP tools: `create_story`, `list_stories`, `get_story`, `update_story`, `delete_story`, `get_story_detail`, `get_story_aggregate`.

### POST /stories
- **Request**: `CreateStoryBody { project_id: string; title: string; content?: string; status?: string; labels?: Label[]; milestone_id?: string | null; }` (`project_id` required — parent project)
- **Response**: `201 Envelope<Story>`
- **Errors**: `404` (project missing), `422`.
- **Example (422)**: `{ "error": "Status value 'foo' is not allowed. Allowed: planned, in-progress, pending-approval, accepted.", "code": "UNPROCESSABLE" }`

### GET /stories?project_id&page&limit&status&label_key&label_value&milestone_id
`project_id` is a **required** query param (404 if the project does not exist; omitting it is a `422`). `milestone_id` (optional, v1.2) filters to stories assigned to that milestone; an unknown `milestone_id` yields an empty page. Every story read is single-project — there is no cross-project story list.
- **Response**: `200 ListEnvelope<Story>`
- **Errors**: `404`.

### GET /stories/:id
- **Response**: `200 Envelope<Story>`
- **Errors**: `404`.

### PUT /stories/:id
- **Request**: `UpdateStoryBody { title?: string; content?: string; status?: string; labels?: Label[]; milestone_id?: string | null; }` (`labels` fully replaces when provided)
- **Response**: `200 Envelope<Story>`
- **Errors**: `404`, `422`. `milestone_id` must belong to the story's project, else `422` "This milestone does not belong to the story's project."; a non-existent `milestone_id` returns `404`.

### DELETE /stories/:id
- **Response**: `204`
- **Errors**: `404`.

### GET /stories/:id/aggregate
- **Response**: `200 Envelope<StoryAggregate>` — `StoryAggregate { story_id: string; total_tasks: number; by_status: Record<string, number>; }` (computed on demand, never stored)
- **Errors**: `404`.

### GET /stories/:id/detail
Composes the story's side collections in one call. Tasks are NOT included — they live on the Kanban board via `GET /stories/:storyId/tasks` + `/aggregate`.
- **Response**: `200 Envelope<StoryDetail>` — `StoryDetail extends Story { links: EnrichedStoryLink[]; attachments: Attachment[]; comments: Comment[]; }` (`comments` newest-first)
- **Errors**: `404`.

---

## Tasks

MCP tools: `create_task`, `list_tasks`, `get_task`, `get_task_detail`, `update_task`, `delete_task`.

### POST /stories/:storyId/tasks
- **Request**: `CreateTaskBody { title: string; content?: string; type: string; status: string; assignee_role?: string; creator_role?: string; labels?: Label[]; }` (`type`/`status` required, dictionary-validated)
- **Response**: `201 Envelope<Task>`
- **Errors**: `404`, `422`.
- **Example (422)**: `{ "error": "Value 'x' is not allowed for field 'type'. Allowed: task, bug, testing-task.", "code": "UNPROCESSABLE" }`

### GET /stories/:storyId/tasks?page&limit&status&type&assignee_role&creator_role
- **Response**: `200 ListEnvelope<Task>`
- **Errors**: `404`.

### GET /tasks/:id
- **Response**: `200 Envelope<Task>`
- **Errors**: `404`.

### PUT /tasks/:id
- **Request**: `UpdateTaskBody { title?: string; content?: string; type?: string; status?: string; assignee_role?: string; creator_role?: string; labels?: Label[]; }` (`story_id` immutable)
- **Response**: `200 Envelope<Task>`
- **Errors**: `404`, `422`.

### DELETE /tasks/:id
- **Response**: `204`
- **Errors**: `404`.

### GET /tasks/:id/detail
- **Response**: `200 Envelope<TaskDetail>` — `TaskDetail extends Task { links: EnrichedTaskLink[]; attachments: Attachment[]; comments: Comment[]; }` (`comments` newest-first)
- **Errors**: `404`.

---

## Task Links

MCP tools: `create_task_link`, `list_task_links`, `delete_task_link`.

### POST /tasks/:taskId/links
- **Request**: `CreateTaskLinkBody { target_task_id: string; link_type: string; }`
- **Response**: `201 Envelope<TaskLink>`
- **Errors** (precedence existence → scope/self/dict → duplicate): `404` (source or target task missing); `422` (`link_type` not in effective dict; source == target "A task cannot link to itself."; cross-story "Cannot link tasks from different stories."); `409` (duplicate `(source, target, link_type)` "This link already exists.").
- **Constraint** (v1.3): source and target must be in the SAME STORY.

### GET /tasks/:taskId/links?page&limit&direction&link_type
`direction`: `"outbound" | "inbound" | "both"` (default `both`).
- **Response**: `200 ListEnvelope<EnrichedTaskLink>`
- **Errors**: `404`.

### DELETE /task-links/:id
- **Response**: `204`
- **Errors**: `404`.

---

## Story Links

Net-new surface (v1.3), parallel to Task Links, scoped to stories in the same project. MCP tools: `create_story_link`, `list_story_links`, `delete_story_link`.

### POST /stories/:storyId/links
- **Request**: `CreateStoryLinkBody { target_story_id: string; link_type: string; }`
- **Response**: `201 Envelope<StoryLink>`
- **Errors** (precedence existence → scope/self/dict → duplicate): `404` (source or target story missing); `422` (`link_type` not in effective dict; source == target "A story cannot link to itself."; cross-project "Cannot link stories from different projects."); `409` (duplicate "This link already exists.").
- **Constraint**: source and target must be in the same project.

### GET /stories/:storyId/links?page&limit&direction&link_type
`direction`: `"outbound" | "inbound" | "both"` (default `both`).
- **Response**: `200 ListEnvelope<EnrichedStoryLink>`
- **Errors**: `404`.

### DELETE /story-links/:id
- **Response**: `204`
- **Errors**: `404`.

---

## Attachments

Create accepts `application/json` (programmatic/MCP) or `multipart/form-data` (Web UI file upload). Container-scoped endpoints exist under stories, tasks, and milestones. Attachments are **immutable once created** (no `PUT` for any kind) and are **never archived** — the lifecycle is create + delete only. MCP tools: `create_document_attachment`, `create_external_ref_attachment`, `create_file_attachment` (base64), `list_attachments`, `get_attachment`, `get_attachment_file`, `delete_attachment`.

### POST /stories/:storyId/attachments · POST /tasks/:taskId/attachments · POST /milestones/:id/attachments
- **Request** (one of):
```typescript
// JSON, kind = document
interface CreateDocumentAttachmentJson {
  title: string; kind: "document";            // title: 1–500, required, non-empty
  content: string; mime_type: "text/markdown" | "text/plain";
  author_role?: string;
}
// JSON, kind = external-ref
interface CreateExternalRefAttachmentJson {
  title: string; kind: "external-ref";        // title: 1–500, required, non-empty
  external_url: string; external_status?: string; author_role?: string;
}
// multipart/form-data, kind = document | image | file
//   fields: title (optional), kind, mime_type, author_role + file (binary)
//   title: absent form field -> defaults to the uploaded file name, truncated to 500 chars;
//     present-but-empty / whitespace-only -> 422 (never silently re-defaulted to the file name).
```
`author_role` is optional on every create path (all kinds); `title` is NOT dictionary-validated. MIME allow-list per kind — document: `text/markdown`, `text/plain`; image: `image/png`, `image/jpeg`, `image/gif`, `image/webp`; file: `application/pdf`, `application/vnd.openxmlformats-officedocument.*` (docx/xlsx/pptx), `text/csv`, `text/plain`, `application/json`, `application/zip`. Size limit: 10 MB for every stored-file kind. **MCP create surface** (agents): document-as-text and external-ref via plain JSON args; image, file, and a document-uploaded-as-a-file via a base64 arg `{ title, kind, mime_type, content_base64, author_role? }` (decoded onto the same service path as multipart, full parity, same MIME allow-list and 10 MB limit). Every MCP create tool requires `title` explicitly (no file name to default from). Binary crosses MCP only as base64; one file per call.
- **Response**: `201 Envelope<Attachment>`
- **Errors**: `404` (container missing); `422` (request-schema validation — content/file missing for the kind; `external_url` invalid; missing/empty/whitespace `title` on the JSON and MCP paths — multipart handles absence as above); `400` (upload business rules Pydantic cannot express — file > 10 MB; unsupported MIME type).

### GET /stories/:storyId/attachments · GET /tasks/:taskId/attachments · GET /milestones/:id/attachments
Query: `?page&limit&kind` (v1.6: the `type` filter is removed). REST silently ignores a stale `?type=`; MCP `list_attachments` no longer declares a `type` kwarg and raises a schema-level `ToolError` if one is passed. `kind` filtering works on both.
- **Response**: `200 ListEnvelope<Attachment>`
- **Errors**: `404`.

### GET /attachments/:id
- **Response**: `200 Envelope<Attachment>` (metadata)
- **Errors**: `404`.

### GET /attachments/:id/file
Serves document | image | file bytes; `Content-Type = mime_type`.
- **Response**: `200` raw file bytes.
- **Errors**: `400` if kind = external-ref ("External reference attachments do not have a stored file."); `404`.
- **MCP-only**: `get_attachment_file(id)` → `{ mime_type, content_base64 }` — the stored file's bytes (base64) for document | image | file, so agents can read content without an HTTP fetch. Error if kind = external-ref (no stored file) or not found.

### DELETE /attachments/:id
Deletable for every kind. Removes the DB row and, for document/image/file, the stored file; external-ref has no stored file so only its row is removed.
- **Response**: `204`
- **Errors**: `404`.

---

## Comments

Containers: stories, tasks, milestones (not attachable to attachments). Comments store Markdown text only. Lists (and detail-composed comment arrays) are ordered **newest-first** — descending `(created_at, id)`; pagination walks newest → oldest; default `limit` is **50**. Labels are free-form; `author_role` is never validated against `participant_roles`. MCP tools: `create_comment`, `list_comments`, `get_comment`, `get_comment_ancestors`, `update_comment`, `delete_comment`.

### POST /stories/:storyId/comments · POST /tasks/:taskId/comments · POST /milestones/:id/comments
- **Request**: `CreateCommentBody { content: string; author_role: string; labels?: Label[]; in_reply_to?: string; }` — `content` 1–50000 required; `author_role` required, non-empty; `in_reply_to` is a request-only input (a parent comment id, same container), never stored or returned, whose only effect is the derived `ancestors` path.
- **Response**: `201 Envelope<Comment>`
- **Errors** (precedence): container exists (`404`) → content non-empty & ≤50000 (`422`) → `author_role` non-empty (`422`) → `in_reply_to` comment exists (`404` "Comment '{id}' not found.") → same container (`422` "A reply must be on the same story, task, or milestone as the comment it replies to.").

### GET /stories/:storyId/comments · GET /tasks/:taskId/comments · GET /milestones/:id/comments
Query: `?page&limit&label_key&label_value&after_id&descendant_of`. `after_id` — keyset watermark: only comments strictly NEWER than the referenced comment, `(created_at, id) > (ref.created_at, ref.id)`; `404` if that comment is absent. `descendant_of` — the sub-thread beneath the referenced comment (comments whose `ancestors` contains it). All filters combine.
- **Response**: `200 ListEnvelope<Comment>` (newest-first)
- **Errors**: `404`.

### GET /comments/:id
- **Response**: `200 Envelope<Comment>`
- **Errors**: `404`.

### GET /comments/:id/ancestors
The ordered ancestor bodies for a comment (oldest ancestor → direct parent); `[]` for a top-level comment; a dangling ancestor id (parent since deleted) is silently skipped.
- **Response**: `200 Comment[]` (bare array, root-first, unpaginated — no envelope)
- **Errors**: `404`.

### PUT /comments/:id
- **Request**: `UpdateCommentBody { content?: string; labels?: Label[]; }` — `author_role` and `ancestors` are immutable (absent from this body). `labels` fully replaces; an empty labels array clears all; updating only `content` leaves labels unchanged and vice versa.
- **Response**: `200 Envelope<Comment>`
- **Errors**: `422`, `404`.

### DELETE /comments/:id
Hard delete (no archive/tombstone). Deleting a story/task/milestone cascades to its comments. A deleted comment's id may still linger in a descendant's `ancestors`; readers degrade gracefully (the id is simply unresolvable).
- **Response**: `204`
- **Errors**: `404`.

---

## Sessions

Every session **belongs to exactly one project** (`project_id`, required on create and on every list). There is no cross-project session listing and no cross-project incomplete query. A session is **incomplete** when its `status` is `pending` or `in-progress` and **complete** when `finished` — `status` is set explicitly and is never inferred from `result_decisions` / `result_summary`. MCP tools: `create_session`, `list_sessions`, `get_session`, `update_session`, `archive_session`, `delete_session`. `list_sessions(project_id, incomplete=true)` is the orchestrator's cross-restart continuity query.

### POST /sessions
- **Request**: `CreateSession { project_id: string; topic: string; goal: string; context?: string; participant_role: string; linked_story_id?: string; linked_task_id?: string; }` — `topic`/`goal` 1–500 required; `participant_role` required, validated vs the project's effective `participant_roles`; each linked id optional and independent, validated to exist and belong to the same project. `status` is NOT a create input — every session is created at `"pending"`; a `status` in the payload is accepted-and-ignored, not rejected.
- **Response**: `201 Envelope<Session>`
- **Errors**: `404` (project_id / a linked id does not exist); `422` (topic/goal length; `participant_role` not in the dictionary; a link in a different project).

### GET /sessions?project_id&page&limit&incomplete&linked_story_id&include_archived
`project_id` is REQUIRED (`422` if omitted). Newest-first. `incomplete=true` → `status != finished`. `linked_story_id` filters to sessions linked to that story. The two filters are independently combinable. Archived sessions are excluded unless `include_archived=true`. There is no `status`-value filter and no symmetric `linked_task_id` filter.
- **Response**: `200 ListEnvelope<Session>`
- **Errors**: `404` (unknown `project_id`).

### GET /sessions/:id
- **Response**: `200 Envelope<Session>`
- **Errors**: `404`.

### PUT /sessions/:id
Partial update. Omitted field → unchanged. Explicit `null` clears `context` / `result_decisions` / `result_summary` / `linked_story_id` / `linked_task_id`. `topic` / `goal` / `participant_role` / `status` are mandatory: explicit `null` → `422`; a new value is re-validated (`topic` & `goal` 1–500; `participant_role` vs the dictionary; `status` vs the fixed enum). `status` may move to any value in any direction (no transition order). A newly-set link id is re-validated for existence + same-project.
- **Request**:
```typescript
interface UpdateSession {
  topic?: string; goal?: string; context?: string | null;
  status?: SessionStatus;                 // present-but-null -> 422; out-of-set -> 422
  participant_role?: string;
  result_decisions?: string | null; result_summary?: string | null;
  linked_story_id?: string | null; linked_task_id?: string | null;
}
```
- **Response**: `200 Envelope<Session>`
- **Errors**: `422`, `404`.
- **Example (out-of-set status 422)**: `{ "error": "Value 'done' is not allowed. Allowed: pending, in-progress, finished.", "code": "VALIDATION_ERROR" }`

### POST /sessions/:id/archive
- **Response**: `200 Envelope<Session>` (`archived_at` set)
- **Errors**: `400` ("Session is already archived." — an archived session stays fully updatable); `404`.

### DELETE /sessions/:id
Permanent removal of the session record; no soft-delete and no recovery. Accepted for **any** session regardless of `archived_at` or `status` — there is no archived-only restriction on this surface. `archive` and `delete` stay independent operations: archiving is the reversible visibility flag, deleting is terminal. A session is a leaf record — deleting one removes nothing else, and a session carrying `linked_story_id` and/or `linked_task_id` is deleted with no effect on the linked story or task.
- **Response**: `204`
- **Errors**: `404`.

---

## Settings

Effective resolution: for each key, use `project_settings.values` if a row exists for `(project_id, key)`, else `system_settings.values`. The same precedence applies to the scalar `default_web_ui_role` (v1.7); its write is validated against the effective `participant_roles` for the scope (422 if outside it). A project override fully **replaces** (not merges) the system default for that key. MCP tools: `get_system_settings`, `set_system_settings`, `get_project_effective_settings`, `set_project_settings`, `clear_project_setting` — all delegate to the same service/schemas and reflect the identical structured `link_types` shape, the scalar `default_web_ui_role`, and the same validation.

### GET /system/settings
- **Response**: `200 Envelope<Settings>`

### PUT /system/settings
- **Request**: `Partial<Settings>` — only provided keys updated.
- **Response**: `200 Envelope<Settings>`
- **Errors**: `422` (unknown key — including a retired key such as `attachment_types`; empty values).

### GET /projects/:projectId/settings
- **Response**: `200 Envelope<SettingsOverrides>` (`{}` if none)
- **Errors**: `404`.

### GET /projects/:projectId/settings/effective
- **Response**: `200 Envelope<Settings>`
- **Errors**: `404`.

### PUT /projects/:projectId/settings
- **Request**: `Partial<Settings>`. A project override fully REPLACES the system default for that key.
- **Response**: `200 Envelope<Settings>` (effective after update)
- **Errors**: `422`, `404`.

---

## Milestones

A milestone belongs to exactly one project and has a lifecycle status (v1.2). MCP tools: `create_milestone`, `list_milestones`, `get_milestone`, `update_milestone`, `delete_milestone`, `activate_milestone`, `finish_milestone`, `list_milestone_stories`, `get_milestone_detail`.

### POST /milestones
- **Request**: `CreateMilestone { name: string; project_id: string; description?: string; }` — created with status `"planned"`.
- **Response**: `201 Envelope<Milestone>`
- **Errors**: `404` (project_id does not exist); `409` (a milestone with this name already exists in that project); `422`.
- **Example (409)**: `{ "error": "A milestone named 'Q3' already exists in this project.", "code": "CONFLICT" }`

### GET /milestones?page&limit&project_id
`project_id` filters to one project's milestones; omit to list across all projects. Each row includes `project_id`, `status`, `story_count`.
- **Response**: `200 ListEnvelope<Milestone>`

### GET /milestones/:id
- **Response**: `200 Envelope<Milestone>` (incl. `story_count`)
- **Errors**: `404`.

### PUT /milestones/:id
- **Request**: `UpdateMilestone { name?: string; description?: string; }` — `project_id` is immutable.
- **Response**: `200 Envelope<Milestone>`
- **Errors**: `404`; `409` (new name collides with another milestone in the same project); `422`.

### DELETE /milestones/:id
Sets `milestone_id = null` on assigned stories; stories not deleted.
- **Response**: `204`
- **Errors**: `404`.

### POST /milestones/:id/activate
Sets this milestone's status to `"active"`. If another milestone in the SAME project is currently `"active"`, that one is atomically demoted to `"planned"` in the same transaction. Idempotent (activating an already-active milestone is a no-op success); valid from any prior status.
- **Response**: `200 Envelope<Milestone>`
- **Errors**: `404`.

### POST /milestones/:id/finish
Sets this milestone's status to `"finished"`. No side effect on other milestones. Idempotent.
- **Response**: `200 Envelope<Milestone>`
- **Errors**: `404`.

### GET /milestones/:id/stories?page&limit
- **Response**: `200 ListEnvelope<Story>` (each incl. `project_id`)
- **Errors**: `404`.

### GET /milestones/:id/detail
Composes the milestone's side collections in one call. Assigned stories are NOT included — they are paginated via `GET /milestones/:id/stories`.
- **Response**: `200 Envelope<MilestoneDetail>` — `MilestoneDetail extends Milestone { attachments: Attachment[]; comments: Comment[]; }` (`comments` newest-first)
- **Errors**: `404`.

> **Board filtering.** There is no dedicated board endpoint. The Board view filters client-side by issuing `GET /stories?project_id=…&milestone_id=…` with the active milestone's id, discovered from the milestone list (`GET /milestones?project_id=…`, the single row whose `status === "active"`).

---

## Status

A lightweight service-liveness + version read (v1.9). It probes **no** dependencies (no DB, no MCP-mount introspection) and carries **no** availability flag — it reports process liveness and the running application version only. MCP tool: `get_status` (mirrors this one-to-one over the same `StatusService`, returning the identical shape).

### GET /status
- **Response**: `200 Envelope<Status>` — `Status { status: string; /* always "ok" */ version: string; /* running application version */ }`

---

## Example exchange

**Request** `POST /stories/3f.../tasks`
```json
{ "title": "Implement task service", "type": "task", "status": "todo", "assignee_role": "backend-developer" }
```
**Response 201**
```json
{
  "data": {
    "id": "9a1c...", "story_id": "3f...", "title": "Implement task service",
    "content": null, "type": "task", "status": "todo",
    "assignee_role": "backend-developer", "creator_role": null, "labels": [],
    "created_at": "2026-06-29T10:00:00Z", "updated_at": "2026-06-29T10:00:00Z"
  }
}
```
**Response 422** (bad status)
```json
{ "error": "Task status 'doing' is not allowed. Allowed: todo, in-progress, done.", "code": "UNPROCESSABLE" }
```

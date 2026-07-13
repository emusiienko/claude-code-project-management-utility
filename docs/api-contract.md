# API Contract — v1.0 — LOCKED

> The interface boundary between frontend, MCP, and backend. Both sides honor it exactly.
> Auth: **none** on every endpoint (local personal tool; Docker localhost mapping is the boundary).
> Rate limit: 1,000 req/min on every endpoint.
> Base path: all REST routes below are relative to the API root (e.g. `http://localhost:8000`).
>
> The MCP server exposes the same operations as tools over HTTP streamable transport. It is **not a
> separate port**: MCP is mounted on a path of the same backend app that serves REST (same container,
> same port `:8000`, e.g. `http://localhost:8000/mcp`). MCP tool names mirror these endpoints
> (e.g. `create_task`, `list_stories`, `get_task_detail`); request and response payloads use the same
> schemas defined here. Domain errors map to MCP tool errors with the same `code`.

> **v1.1 revision — approved by user 2026-07-07 (Stories domain only).** The Stories list/create
> endpoints move from the project-scoped path `/projects/:projectId/stories` to a single base path
> `/stories`. `project_id` becomes a request-body field (POST) and a required query parameter (GET
> list). All other Story endpoints, request/response schemas, and every other domain are unchanged.
> Future Story filters (e.g. `milestone_id`) follow the same query-parameter pattern.

> **v1.2 revision — approved by user 2026-07-10 (Milestones domain only).** A milestone now belongs
> to **exactly one project** (single `project_id`, replacing the former M:N `project_ids[]` set) and
> carries a **lifecycle status** (`planned` → `active` → `finished`, lowercase on the wire). At most
> one milestone per project may be `active`. Two action endpoints drive transitions
> (`POST /milestones/:id/activate`, `POST /milestones/:id/finish`); activation atomically demotes the
> project's previously-active milestone back to `planned`. This supersedes the LOCKED v1.0 Milestones
> shape. The `Story.milestone_id` field and every other domain are unchanged.

> **v1.3 revision — ratified at STORY-006 reconcile 2026-07-13 (Work Item Linking).** Two changes:
> (1) **Task-link scope is narrowed from project to story.** The LOCKED v1.0 note read "source and
> target must be in the same project"; the implemented rule requires both tasks to share the **same
> `story_id`** (cross-story attempts rejected with 422 "Cannot link tasks from different stories.").
> Two tasks in one story are always in one project, so the narrower rule strictly satisfies the
> earlier wording. (2) **The Story Links surface is added** — `story_links` is a net-new domain
> parallel to `task_links`: `POST /stories/:storyId/links`, `GET /stories/:storyId/links`,
> `DELETE /story-links/:id`, the `StoryLink` / `EnrichedStoryLink` entities, and a `links` field on
> `StoryDetail`. Same schema, validation, and enrichment shape as task links, scoped to stories in the
> **same project**. See ADR-017 (two separate link domains) and ADR-018 (application-level link
> cleanup). All other domains unchanged.

---

## Shared shapes

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

// Error code ↔ status mapping:
//   422 VALIDATION_ERROR — request-schema (Pydantic) validation; carries details[] field errors
//   422 UNPROCESSABLE     — dictionary / business-rule violation (allowed-value, association, etc.)
//   400 VALIDATION_ERROR — non-schema bad request (immutable-field edit, unparseable JSON, upload
//                          business rules, invalid-state operations)

// Free-form label
interface Label { key: string; value: string; }   // key required & non-empty
```

HTTP status conventions: `201` create, `200` read/update, `204` delete (no body),
`422` request-schema (Pydantic) validation AND dictionary violation — malformed/invalid request
body or query params, or a value outside an effective dictionary,
`400` other bad request (business-rule validation, immutable-field edits, unparseable JSON),
`404` not found, `409` conflict, `500` internal.

> Note: request-body/query-param schema validation (Pydantic) returns **422**. `400` is reserved for
> bad-request errors that are not schema violations — business-logic validation, edits to immutable
> fields, and JSON that cannot be parsed at all.

---

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

// TaskLink enriched with the linked task's summary (returned by link/detail/dependency endpoints)
interface EnrichedTaskLink extends TaskLink {
  direction?: "outbound" | "inbound";
  linked_task: { id: string; title: string; status: string; };
}

// v1.3 — Story links mirror task links, scoped to stories in the same project.
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

type AttachmentKind = "document" | "image" | "external-ref";
type ContainerType = "story" | "task" | "milestone";

interface Attachment {
  id: string;
  container_type: ContainerType;
  container_id: string;
  type: string;              // from attachment_types
  kind: AttachmentKind;
  mime_type: string | null;       // required when kind = document|image
  file_size_bytes: number | null; // required when kind = document|image
  archived_at: string | null;     // document|image only
  external_url: string | null;    // required when kind = external-ref
  external_status: string | null; // external-ref only, free-form
  created_at: string;
  updated_at: string;
  // file_path is server-internal and NEVER serialized
}

interface AttachmentVersion {
  id: string;
  attachment_id: string;
  file_size_bytes: number;
  author_role: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  container_type: ContainerType;  // story | task | milestone (NOT attachment)
  container_id: string;
  author_role: string | null;
  content: string;           // 1–50000, Markdown
  labels: Label[];
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  topic: string;             // 1–500 (immutable after create)
  context: string | null;
  result_decisions: string | null;
  result_summary: string | null;
  status: string | null;     // free-form, max 100
  participant_role: string | null;
  linked_story_id: string | null;
  linked_task_id: string | null;
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

type DictionaryKey =
  | "task_statuses" | "task_types" | "story_statuses"
  | "attachment_types" | "link_types" | "participant_roles";

type Settings = Record<DictionaryKey, string[]>;       // full set of six
type SettingsOverrides = Partial<Record<DictionaryKey, string[]>>; // project-level
```

---

## Projects

<!-- updated: 2026-07-06 (STORY-003 reconcile): naming-only alignment — the request interfaces were
     renamed `CreateProjectBody`/`UpdateProjectBody` → `CreateProject`/`UpdateProject` (no `Body`
     suffix) to match the ratified schema/type naming convention (BUG-010 backend, BUG-011 frontend).
     Wire shapes are byte-identical to LOCKED v1.0 — no field, path, status, or envelope changed. -->

```typescript
// POST /projects                       -> 201 Envelope<Project>   | 422, 409, 500
interface CreateProject { name: string; description?: string; }

// GET  /projects?page&limit             -> 200 ListEnvelope<Project>
// GET  /projects/:id                    -> 200 Envelope<Project>   | 404
// PUT  /projects/:id                    -> 200 Envelope<Project>   | 422, 404, 409
interface UpdateProject { name?: string; description?: string; }
// DELETE /projects/:id                  -> 204                     | 404
//   Cascade: stories -> tasks -> attachments/versions/comments/links/project_settings.
//   Sessions linked to deleted stories/tasks have links set to null.
//   A malformed (non-UUID) :id returns 404 NOT_FOUND, not 422 (ADR-011).
```

**409 example:** `{ "error": "A project with this name already exists.", "code": "CONFLICT" }`

---

## Stories

```typescript
// POST /stories                          -> 201 Envelope<Story>   | 404, 422
interface CreateStoryBody {
  project_id: string;         // required — parent project
  title: string; content?: string; status?: string;
  labels?: Label[]; milestone_id?: string | null;
}

// GET  /stories?project_id&page&limit&status&label_key&label_value&milestone_id
//                                        -> 200 ListEnvelope<Story> | 404
//   project_id is a required query param. 404 if the project does not exist.
//   milestone_id (optional, v1.2): filter to stories assigned to that milestone. Used by the
//   Board view to show only the active milestone's stories. Unknown milestone_id yields an empty page.
// GET  /stories/:id                      -> 200 Envelope<Story>     | 404
// PUT  /stories/:id                      -> 200 Envelope<Story>     | 404, 422
interface UpdateStoryBody {
  title?: string; content?: string; status?: string;
  labels?: Label[];           // fully replaces when provided
  milestone_id?: string | null;
}
// DELETE /stories/:id                    -> 204                     | 404

// GET /stories/:id/aggregate             -> 200 Envelope<StoryAggregate> | 404
interface StoryAggregate {
  story_id: string;
  total_tasks: number;
  by_status: Record<string, number>;  // computed on demand, never stored
}

// GET /stories/:id/detail                -> 200 Envelope<StoryDetail> | 404
//   Composes the story's side collections in one call. Tasks are NOT included —
//   they live on the Kanban board via GET /stories/:storyId/tasks + /aggregate.
interface StoryDetail extends Story {
  links: EnrichedStoryLink[];  // v1.3 — outbound + inbound, enriched (STORY-006)
  attachments: Attachment[];   // active only (empty until STORY-007)
  comments: Comment[];         // created_at ASC (empty until STORY-008)
}
```

**422 example:** `{ "error": "Status value 'foo' is not allowed. Allowed: planned, in-progress, pending-approval, accepted.", "code": "UNPROCESSABLE" }`

> **Relation to Cross-project Queries (v1.1).** The `GET /stories` list above is the single primary
> Story list endpoint and requires `project_id`. The `GET /stories` entry under *Cross-project
> Queries* describes the same path with `project_id` **optional** (omit to list stories across all
> projects). Both are served by one handler: when `project_id` is present it scopes to that project
> (404 if the project is missing); when absent it returns stories across all projects.

> `milestone_id` constraint (v1.2): the milestone must belong to the story's project, else `422`
> "This milestone does not belong to the story's project." A non-existent `milestone_id` returns `404`.

---

## Tasks

```typescript
// POST /stories/:storyId/tasks           -> 201 Envelope<Task>   | 404, 422
interface CreateTaskBody {
  title: string; content?: string;
  type: string; status: string;          // required, dictionary-validated
  assignee_role?: string; creator_role?: string;
  labels?: Label[];
}

// GET  /stories/:storyId/tasks?page&limit&status&type&assignee_role&creator_role
//                                        -> 200 ListEnvelope<Task> | 404
// GET  /tasks/:id                        -> 200 Envelope<Task>     | 404
// PUT  /tasks/:id                        -> 200 Envelope<Task>     | 404, 422
interface UpdateTaskBody {               // story_id immutable
  title?: string; content?: string; type?: string; status?: string;
  assignee_role?: string; creator_role?: string; labels?: Label[];
}
// DELETE /tasks/:id                      -> 204                    | 404

// GET /tasks/:id/detail                  -> 200 Envelope<TaskDetail> | 404
interface TaskDetail extends Task {
  links: EnrichedTaskLink[];
  attachments: Attachment[];             // active only
  comments: Comment[];                   // created_at ASC
}

// GET /tasks/:id/dependencies            -> 200 Envelope<TaskDependencies> | 404
interface TaskDependencies {
  task_id: string;
  inbound_depends_on: { task_id: string; task_title: string; task_status: string; }[];
  // raw data only — the utility never enforces blocking
}
```

**422 example:** `{ "error": "Value 'x' is not allowed for field 'type'. Allowed: task, bug, testing-task.", "code": "UNPROCESSABLE" }`

---

## Task Links

```typescript
// POST /tasks/:taskId/links              -> 201 Envelope<TaskLink> | 404, 409, 422
interface CreateTaskLinkBody { target_task_id: string; link_type: string; }
//   Error precedence: existence (404) -> scope/self/dict (422) -> duplicate (409).
//   404: source or target task missing.
//   422: link_type not in effective dict; source == target ("A task cannot link to itself.");
//        cross-story ("Cannot link tasks from different stories.")
//   409: duplicate (source, target, link_type) ("This link already exists.")
//   Constraint (v1.3): source and target must be in the SAME STORY (narrowed from same-project).

// GET  /tasks/:taskId/links?page&limit&direction&link_type
//   direction: "outbound" | "inbound" | "both" (default both)
//                                        -> 200 ListEnvelope<EnrichedTaskLink> | 404
// DELETE /task-links/:id                 -> 204                    | 404
```

---

## Story Links

<!-- v1.3 (2026-07-13, STORY-006): net-new surface. Parallel to Task Links, scoped to stories in
     the same project. Same validation/enrichment shape; separate domain (ADR-017). -->

```typescript
// POST /stories/:storyId/links           -> 201 Envelope<StoryLink> | 404, 409, 422
interface CreateStoryLinkBody { target_story_id: string; link_type: string; }
//   Error precedence: existence (404) -> scope/self/dict (422) -> duplicate (409).
//   404: source or target story missing.
//   422: link_type not in effective dict; source == target ("A story cannot link to itself.");
//        cross-project ("Cannot link stories from different projects.")
//   409: duplicate (source, target, link_type) ("This link already exists.")
//   Constraint: source and target must be in the same project.

// GET  /stories/:storyId/links?page&limit&direction&link_type
//   direction: "outbound" | "inbound" | "both" (default both)
//                                        -> 200 ListEnvelope<EnrichedStoryLink> | 404
// DELETE /story-links/:id                -> 204                    | 404
```

---

## Attachments

Create accepts `application/json` (programmatic/MCP) or `multipart/form-data` (Web UI file upload).
Endpoints exist under stories, tasks, and milestones containers.

```typescript
// POST /stories/:storyId/attachments
// POST /tasks/:taskId/attachments
// POST /milestones/:id/attachments       -> 201 Envelope<Attachment> | 400, 404, 422

// JSON, kind = document
interface CreateDocumentAttachmentJson {
  type: string; kind: "document";
  content: string; mime_type: "text/markdown" | "text/plain";
  author_role?: string;
}
// JSON, kind = external-ref
interface CreateExternalRefAttachmentJson {
  type: string; kind: "external-ref";
  external_url: string; external_status?: string;
}
// multipart/form-data, kind = document | image
//   fields: type, kind, mime_type, author_role + file (binary)
//   422: request-schema validation — content/file missing for the kind; external_url invalid
//   400: upload business rules Pydantic cannot express — file > 10 MB; unsupported MIME type

// GET  /stories/:storyId/attachments
// GET  /tasks/:taskId/attachments
// GET  /milestones/:id/attachments
//   ?page&limit&type&kind&include_archived (default false)
//                                        -> 200 ListEnvelope<Attachment> | 404

// GET  /attachments/:id                  -> 200 Envelope<Attachment> (metadata) | 404
// GET  /attachments/:id/file             -> 200 raw file, Content-Type = mime_type
//   400 if kind = external-ref ("External reference attachments do not have a stored file."); 404

// PUT  /attachments/:id                  -> 200 Envelope<Attachment> | 400, 404
//   document via JSON: { content, author_role }  -> creates new AttachmentVersion
//   document via multipart: file + optional author_role
//   external-ref: { external_url, external_status }
//   image: not updatable -> 400 ; archived document: not updatable -> 400

// GET  /attachments/:id/history?page&limit  -> 200 ListEnvelope<AttachmentVersion> | 400 (not a document), 404
// GET  /attachment-versions/:id/file        -> 200 raw snapshot file | 404

// POST /attachments/:id/archive          -> 200 Envelope<Attachment> (archived_at set)
//   400 already archived / external-ref kind; 404
// DELETE /attachments/:id                -> 204                     | 400 (document|image kind), 404
//   Only external-ref is deletable; document/image are archived, never deleted.
```

---

## Comments

Containers: stories, tasks, milestones. Not attachable to attachments.

```typescript
// POST /stories/:storyId/comments
// POST /tasks/:taskId/comments
// POST /milestones/:id/comments          -> 201 Envelope<Comment> | 422, 404
interface CreateCommentBody { content: string; author_role?: string; labels?: Label[]; }

// GET  /stories/:storyId/comments
// GET  /tasks/:taskId/comments
// GET  /milestones/:id/comments
//   ?page&limit&label_key&label_value     -> 200 ListEnvelope<Comment> (created_at ASC) | 404
// GET  /comments/:id                      -> 200 Envelope<Comment> | 404
// PUT  /comments/:id                      -> 200 Envelope<Comment> | 422, 404
interface UpdateCommentBody { content?: string; labels?: Label[]; } // labels fully replaces
// DELETE /comments/:id                    -> 204 | 404
```

---

## Sessions

Sessions do not belong to a project. A session with both `result_decisions` and `result_summary`
null is **incomplete**.

```typescript
// POST /sessions                          -> 201 Envelope<Session> | 422, 404 (linked ids)
interface CreateSessionBody {
  topic: string; context?: string; status?: string; participant_role?: string;
  linked_story_id?: string; linked_task_id?: string;
}
// GET  /sessions?page&limit&incomplete&status&include_archived
//                                         -> 200 ListEnvelope<Session>
// GET  /sessions/:id                      -> 200 Envelope<Session> | 404
// PUT  /sessions/:id                      -> 200 Envelope<Session> | 400, 422, 404
//   422: request-schema validation on updatable fields.
interface UpdateSessionBody {            // topic NOT updatable (business rule) -> 400 if provided
  status?: string; context?: string;
  result_decisions?: string; result_summary?: string;
  participant_role?: string; linked_story_id?: string | null; linked_task_id?: string | null;
}
// POST /sessions/:id/archive              -> 200 Envelope<Session> (archived_at set) | 400 (already), 404
```

---

## Settings

```typescript
// GET  /system/settings                   -> 200 Envelope<Settings>
// PUT  /system/settings                    -> 200 Envelope<Settings> | 422 (unknown key; empty values)
//   Body: Partial<Settings> — only provided keys updated.

// GET  /projects/:projectId/settings       -> 200 Envelope<SettingsOverrides> ({} if none) | 404
// GET  /projects/:projectId/settings/effective -> 200 Envelope<Settings> | 404
// PUT  /projects/:projectId/settings        -> 200 Envelope<Settings> (effective after update) | 422, 404
//   Body: Partial<Settings>. A project override fully REPLACES (not merges) the system default for that key.
```

Effective resolution: for each key, use `project_settings.values` if a row exists for
`(project_id, key)`, else `system_settings.values`.

---

## Milestones

<!-- v1.2 (2026-07-10): single-project ownership + lifecycle status. Supersedes the LOCKED v1.0
     M:N (project_ids[]) shape. A milestone belongs to exactly one project and has a status. -->
<!-- updated: 2026-07-11 (STORY-012 reconcile): request schemas ratified without the `Body` suffix
     (`CreateMilestone`/`UpdateMilestone`) to match the codebase naming convention, as built. The
     `GET /milestones/:id/detail` endpoint below is specified but NOT yet implemented — it is deferred
     until the attachments (STORY-007) and comments (STORY-008) domains exist. See architecture.md
     § Known Divergences. All other Milestone endpoints are implemented and match this contract. -->

```typescript
// POST /milestones                         -> 201 Envelope<Milestone> | 422, 404, 409
interface CreateMilestone { name: string; project_id: string; description?: string; }
//   Created with status "planned". 404 if project_id does not exist.
//   409 if a milestone with this name already exists in that project.

// GET  /milestones?page&limit&project_id    -> 200 ListEnvelope<Milestone> (incl. project_id, status, story_count)
//   project_id filters to one project's milestones; omit to list across all projects.
// GET  /milestones/:id                      -> 200 Envelope<Milestone> | 404  (incl. story_count)
// PUT  /milestones/:id                      -> 200 Envelope<Milestone> | 404, 409, 422
interface UpdateMilestone {                 // name + description only; project_id is immutable
  name?: string; description?: string;
}
//   Editing project_id is not supported (immutable after create).
//   409 if the new name collides with another milestone in the same project.
// DELETE /milestones/:id                    -> 204 | 404
//   Sets milestone_id = null on assigned stories; stories not deleted.

// --- Lifecycle transitions (server-owned, atomic) ---
// POST /milestones/:id/activate             -> 200 Envelope<Milestone> | 404
//   Sets this milestone's status to "active". If another milestone in the SAME project is
//   currently "active", that one is atomically demoted to "planned" in the same transaction.
//   Idempotent: activating an already-active milestone is a no-op success.
//   Valid from any prior status ("planned" or "finished" -> "active").
// POST /milestones/:id/finish               -> 200 Envelope<Milestone> | 404
//   Sets this milestone's status to "finished". No side effect on other milestones.
//   Idempotent: finishing an already-finished milestone is a no-op success.

// GET  /milestones/:id/stories?page&limit    -> 200 ListEnvelope<Story> (each incl. project_id) | 404

// GET  /milestones/:id/detail                -> 200 Envelope<MilestoneDetail> | 404
//   NOT YET IMPLEMENTED (deferred until attachments/comments domains exist — STORY-007/008).
//   Composes the milestone's side collections in one call. Assigned stories are NOT included —
//   they are paginated via GET /milestones/:id/stories.
interface MilestoneDetail extends Milestone {
  attachments: Attachment[];   // active only
  comments: Comment[];         // created_at ASC
}
```

**409 example:** `{ "error": "A milestone named 'Q3' already exists in this project.", "code": "CONFLICT" }`

> **Board filtering.** There is no dedicated "board" endpoint. The Board view filters client-side by
> issuing the existing `GET /stories?project_id=…&milestone_id=…` list with the active milestone's id.
> The frontend discovers a project's active milestone from the milestone list
> (`GET /milestones?project_id=…`, the single row whose `status === "active"`).

---

## Cross-project Queries

```typescript
// GET /stories?page&limit&project_id&status&label_key&label_value&milestone_id
//                                          -> 200 ListEnvelope<Story> (each incl. project_id)
// GET /tasks?page&limit&project_id&story_id&status&type&assignee_role&creator_role
//                                          -> 200 ListEnvelope<Task> (each incl. story_id + derived project_id)
```

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

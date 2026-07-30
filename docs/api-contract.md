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

> **v1.5 revision — approved by user 2026-07-14 (Attachments domain only, pre-implementation).**
> Five changes: **(1) Version history is removed** — the `AttachmentVersion` entity, the
> `GET /attachments/:id/history` endpoint, and the `GET /attachment-versions/:id/file` endpoint are
> dropped; each attachment has exactly one stored file. **(2) Attachments are immutable — the
> `PUT /attachments/:id` update endpoint is removed for all kinds.** To change a document's content or
> an external-ref's `external_status`, delete the old attachment and create a new one. **(3) A new
> `file` kind is added** for opaque binary attachments (PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP —
> explicit MIME allow-list), uploaded via multipart, downloaded via `GET /attachments/:id/file`, 10 MB
> limit. Agents get a full create/read surface over MCP via base64: they can upload any stored-file
> kind (`content_base64` + `mime_type`, decoded onto the same service path as multipart) and read any
> stored file via `get_attachment_file` → `{ mime_type, content_base64 }`. **(4) Archive is removed** —
> the `POST /attachments/:id/archive` endpoint, the `archived_at` field, and the `include_archived` list
> filter are dropped. The lifecycle is **create + delete only**, and `DELETE /attachments/:id` now works
> for **every** kind (removes the DB row and, for document/image/file, the stored file). **(5)
> `author_role` moves onto the `Attachment` entity** (it previously lived on the removed
> `AttachmentVersion`) — optional, free-form, accepted on every create path, immutable after create. No
> attachments code existed when this revision was made, so it is a clean contract change, not an
> as-built divergence. All other domains unchanged.

> **v1.6 revision — ratified at STORY-021 reconcile 2026-07-15 (Attachments + Settings).** The
> Attachment's dictionary-bound `type` field is **replaced by a mandatory free-form `title`** string
> (1–500 chars, not dictionary-validated) on the entity, on every create path (document-as-text JSON,
> external-ref JSON, multipart, and MCP base64), and in the response. Rules as built: a missing,
> empty, or whitespace-only `title` is rejected **422** on every path. On the **multipart** path only,
> an *absent* `title` form field defaults to the uploaded file's name truncated to 500 chars, while a
> *present-but-empty* field is still rejected 422 (never silently re-defaulted). The
> **`attachment_types` dictionary key is retired** — `DictionaryKey` drops from six keys to five
> (`task_statuses`, `task_types`, `story_statuses`, `link_types`, `participant_roles`); a `PUT`
> settings request including `attachment_types` is rejected as an unknown key (**422**, the same
> path/status as any other unknown key — not 400). Attachment **list** endpoints drop the `type` query
> param: `kind` filtering is unchanged; a stale `?type=` on the REST list is silently ignored, whereas
> the MCP `list_attachments` tool no longer declares a `type` kwarg and raises a schema-level
> `ToolError` if one is passed (strict RPC kwargs vs. lenient REST query strings — an inherent
> transport difference, not a gap). Attachments remain immutable (no `PUT`); `title` is set once at
> create. No new ADR — a spec-mandated refinement of the shipped Attachments feature.

> **v1.7 revision — ratified at STORY-008 reconcile 2026-07-21 (Work Item Comments + Settings).**
> The Comments domain is now built for all three containers (stories, tasks, milestones) and the
> Settings surface gains one scalar key. Changes vs. the LOCKED v1.0 Comments shape:
> **(1) `author_role` is now required and immutable** on every comment and every create path (Web UI,
> REST, MCP) — it was optional/nullable in v1.0. The server never substitutes a default; a
> missing/empty value is rejected 422 ("Comment author is required."). Only `content` and `labels`
> are updatable. **(2) Replies use a persisted, immutable materialized ancestor path.** The `Comment`
> entity gains `ancestors: string[]` — the ordered (root-first) list of ancestor comment ids, empty
> for a top-level comment, derived once at create as `parent.ancestors + [parent.id]`. `CreateCommentBody`
> accepts an optional, **request-only** `in_reply_to` (a comment id); when present the server validates
> the parent exists (404) and shares the same container (422), then persists the computed `ancestors`.
> `in_reply_to` is never stored or returned as its own field. This is a deliberate architect override
> of the description's schema-free "prepend a link to `content`" mechanism — see ADR-023. **(3) A
> lineage endpoint is added** — `GET /comments/:id/ancestors` returns a bare, unpaginated `Comment[]`
> root-first. **(4) List ordering is newest-first** — container comment lists and detail-composed
> `comments` arrays return descending `(created_at, id)`; pagination walks newest → oldest. Default
> `limit` is 50. Two watermark/sub-thread filters are added: `after_id` (keyset "strictly newer than
> the referenced comment," 404 if that comment is absent) and `descendant_of` (the sub-thread beneath
> a comment). **(5) `MilestoneDetail.comments` / `StoryDetail`/`TaskDetail` comments are now populated**
> (newest-first), closing the previously-empty arrays. **Settings:** a new scalar key
> **`default_web_ui_role`** is added to `Settings` (required `string`) and `SettingsOverrides`
> (optional) — the single value the Web UI pre-fills into a comment's `author_role`. On write it must
> be non-empty and a member of the effective `participant_roles` for the scope (422 otherwise); it is
> the first non-list settings key. The `participant_roles` seed gains `"operator"` (the human
> orchestrator) and the system `default_web_ui_role` seeds to `"operator"`. See ADR-022 (scalar
> setting) and ADR-024 (`operator` role). All other domains unchanged.

> **v1.8 revision — ratified at STORY-009 reconcile 2026-07-30 (Sessions domain only).** The Sessions
> `## Sessions` block below and the `Session` entity replace the stale v1.0 forward-spec (project-less
> sessions; completion *derived* from both result fields being null; free-form `status`; immutable
> `topic`). As built: **(1) A session belongs to exactly one project** — `project_id` is a required
> create-body field and a **required** `project_id` query param on the list; there is no cross-project
> session listing and no cross-project incomplete query. **(2) A required `goal` field** (1–500,
> free-form, the purpose the session was created for) joins `topic` and `context`. **(3) `status` is a
> fixed three-value enum** — `pending` (default at create, never a create input) / `in-progress` /
> `finished` — settable to any value in any direction on update, **not** dictionary-validated (a
> deliberate divergence from `task_statuses`/`story_statuses`; validated at the schema layer). The
> retired v1.0 "both result fields null = incomplete" derivation and the interim `is_complete` boolean
> are both gone; **incomplete = `status` is `pending` or `in-progress`**. `result_decisions` /
> `result_summary` are purely informational and never affect `status`. **(4) `participant_role` is
> required and dictionary-validated** against the project's effective `participant_roles` (422, same
> convention as `default_web_ui_role` / task roles). **(5) `topic`, `goal`, `participant_role`, and
> `status` are mandatory and non-clearable** on update (explicit `null` → 422); `context`,
> `result_decisions`, `result_summary`, `linked_story_id`, `linked_task_id` clear on explicit `null`.
> **(6) `linked_story_id` and `linked_task_id` are two independent optional links** (either / both /
> neither), each validated on set to exist (404) and belong to the **same project** (422); each is
> nulled application-side when its target is deleted (SQLite FK inert — ADR-018 pattern). **(7) The list
> filters are `incomplete` (`status != finished`) + `linked_story_id` + `include_archived`**, all
> independently combinable; there is no `status`-value filter and no symmetric `linked_task_id` filter
> yet. Request/response schemas use the house naming (`CreateSession` / `UpdateSession` / `Session`, no
> `Body`/`Response` suffix). See ADR-026 (project scope + fixed status enum) and ADR-027 (Sessions as a
> distinct app mode). All other domains unchanged.

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
  author_role: string | null;     // optional, free-form — who created it; descriptive metadata, set at create
  created_at: string;
  updated_at: string;
  // file_path is server-internal and NEVER serialized
}

// v1.7 (2026-07-21, STORY-008): author_role is now REQUIRED and immutable (was nullable);
// `ancestors` added for the persisted materialized reply path (ADR-023).
interface Comment {
  id: string;
  container_type: ContainerType;  // story | task | milestone (NOT attachment)
  container_id: string;
  author_role: string;       // required, non-empty, immutable after create
  content: string;           // 1–50000, Markdown
  labels: Label[];
  ancestors: string[];       // ordered root-first ancestor comment ids; [] for a top-level comment
  created_at: string;
  updated_at: string;
}

type SessionStatus = "pending" | "in-progress" | "finished";  // fixed enum; NOT dictionary-validated

interface Session {                          // v1.8 — as built (STORY-009)
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

// v1.6 (2026-07-15, STORY-021): `attachment_types` retired — five keys, not six.
type DictionaryKey =
  | "task_statuses" | "task_types" | "story_statuses"
  | "link_types" | "participant_roles";

type PlainDictionaryKey = Exclude<DictionaryKey, "link_types">;

// v1.4 (2026-07-13, STORY-020): link_types is the ONLY dictionary that stores structured
// entries. Each entry carries the machine value plus its directional display labels, so the
// frontend never needs a hardcoded slug→label map. The other four keys remain plain-string arrays.
interface LinkTypeEntry {
  value: string;      // machine key stored on TaskLink.link_type / StoryLink.link_type (1–200 chars)
  outbound: string;   // label shown on the SOURCE side of the relationship (1–200 chars)
  inbound: string;    // label shown on the TARGET side of the relationship (1–200 chars)
}

// Heterogeneous by key: link_types is LinkTypeEntry[], the four plain keys are string[],
// and (v1.7, STORY-008) default_web_ui_role is a single scalar string — the first non-list key.
interface Settings extends Record<PlainDictionaryKey, string[]> {
  link_types: LinkTypeEntry[];
  default_web_ui_role: string;   // required; the Web UI's default comment author_role
}
interface SettingsOverrides extends Partial<Record<PlainDictionaryKey, string[]>> {
  link_types?: LinkTypeEntry[];
  default_web_ui_role?: string;  // project override; scalar
}
```

**`default_web_ui_role`** (STORY-008, ADR-022): a single-value setting living in the same
`(key, values)` store as the dictionaries, resolved with the same system-default + project-override
precedence (a project override fully replaces the system value). On write it must be non-empty and a
member of the effective `participant_roles` for the scope (system `participant_roles` for a system
write; the project's effective set for a project override) — otherwise **422** with the
"Value '{v}' is not allowed. Allowed: {list}." message. It is never re-validated on read and never
constrains a comment's own free-form `author_role`. Its only product effect is pre-filling the Add
Comment form. System default is `"operator"`.

**`link_types` validation** (STORY-020): each entry must be an object with all three fields
(`value`, `outbound`, `inbound`), each a non-empty string 1–200 chars. Plain-string entries are
rejected. Duplicate `value` fields within the same array are rejected. Symmetric entries
(`outbound == inbound`) are valid. Stored `TaskLink.link_type` / `StoryLink.link_type` still hold
only the plain `value` string; link-type validation on link creation continues to check against the
set of `value` fields of the effective `link_types` — behavior unchanged from the caller's view.

**Validation status codes** (as built, STORY-020): plain-string / missing-field / blank-field /
over-length entries fail Pydantic request-schema validation → **422** (body carries the
`"link_types entries must be objects with 'value', 'outbound', and 'inbound' fields"` message with a
Pydantic `"Value error, "` prefix). Duplicate `value` and empty-list are service-layer domain
`ValidationError`s → **400** (`"link_types values must be unique"` / `"Dictionary values cannot be
empty."`). The story anticipated 422 for the duplicate case; as built it is 400 because duplicate
detection lives in the service layer. See architecture.md § Known Divergences.

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
//   Cascade: stories -> tasks -> attachments/comments/links/project_settings; the project's sessions too.
//   (No attachment versions — attachments are immutable, one file each; see v1.5 / ADR-021.)
//   Sessions linked to a deleted story/task keep the session and null just that link (v1.8).
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
  attachments: Attachment[];   // the story's attachments (composed since STORY-007)
  comments: Comment[];         // newest-first (composed since STORY-008)
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
  attachments: Attachment[];             // the task's attachments
  comments: Comment[];                   // newest-first (composed since STORY-008)
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
  title: string; kind: "document";            // title: 1–500, required, non-empty (v1.6)
  content: string; mime_type: "text/markdown" | "text/plain";
  author_role?: string;
}
// JSON, kind = external-ref
interface CreateExternalRefAttachmentJson {
  title: string; kind: "external-ref";        // title: 1–500, required, non-empty (v1.6)
  external_url: string; external_status?: string; author_role?: string;
}
// multipart/form-data, kind = document | image | file
//   fields: title (optional), kind, mime_type, author_role + file (binary)
//   title (v1.6): absent form field -> defaults to the uploaded file name, truncated to 500 chars;
//     present-but-empty / whitespace-only -> 422 (never silently re-defaulted to the file name).
//   422: request-schema validation — content/file missing for the kind; external_url invalid;
//     missing/empty/whitespace title on the JSON and MCP paths (multipart handles absence as above)
//   400: upload business rules Pydantic cannot express — file > 10 MB; unsupported MIME type
//   author_role is optional on every create path (all kinds); title is NOT dictionary-validated.
//   MIME allow-list per kind:
//     document: text/markdown, text/plain
//     image:    image/png, image/jpeg, image/gif, image/webp
//     file:     application/pdf, application/vnd.openxmlformats-officedocument.* (docx/xlsx/pptx),
//               text/csv, text/plain, application/json, application/zip
//   Size limit: 10 MB for every stored-file kind (document, image, file).
//
// MCP create surface (agents): document-as-text and external-ref via plain JSON args; image, file, and
//   a document uploaded AS A FILE via a base64 arg { title, kind, mime_type, content_base64, author_role? }.
//   Every MCP create tool requires `title` explicitly (v1.6) — there is no file name to default from
//   over MCP, so omitting it is rejected. The tool decodes base64 onto the same service path as the REST
//   multipart route (full upload parity with the Web UI). Same per-kind MIME allow-list and 10 MB limit.
//   Binary never crosses MCP except as base64; one file per call.

// GET  /stories/:storyId/attachments
// GET  /tasks/:taskId/attachments
// GET  /milestones/:id/attachments
//   ?page&limit&kind                     (v1.6: the `type` filter is removed)
//     REST: a stale `?type=` query param is silently ignored (not an error).
//     MCP list_attachments: the `type` kwarg is removed — passing it raises a schema-level ToolError
//     (strict RPC kwargs), unlike the lenient REST query string. `kind` filtering works on both.
//                                        -> 200 ListEnvelope<Attachment> | 404

// GET  /attachments/:id                  -> 200 Envelope<Attachment> (metadata) | 404
// GET  /attachments/:id/file             -> 200 raw file, Content-Type = mime_type
//   Serves document | image | file bytes.
//   400 if kind = external-ref ("External reference attachments do not have a stored file."); 404

// MCP-only: get_attachment_file(id) -> { mime_type, content_base64 }
//   Returns the stored file's bytes (base64) for document | image | file, so agents can read
//   attachment content (e.g. a PDF or an existing document) without an HTTP fetch.
//   Error if kind = external-ref (no stored file); not found -> error. No REST equivalent
//   beyond GET /attachments/:id/file.

// Attachments are immutable once created — there is NO update (PUT) endpoint for any kind.
// To change content or an external-ref's status: delete the old one and create a new one.
// There is NO archive: the lifecycle is create + delete only.

// DELETE /attachments/:id                -> 204                     | 404
//   Deletable for every kind. Removes the DB row and, for document/image/file, the stored file.
//   external-ref has no stored file, so only its row is removed.
```

---

## Comments

<!-- v1.7 (2026-07-21, STORY-008): built for all three containers. author_role now required +
     immutable; persisted materialized `ancestors` reply path (ADR-023); newest-first lists;
     `after_id`/`descendant_of` filters; `GET /comments/:id/ancestors` lineage endpoint. -->

Containers: stories, tasks, milestones. Not attachable to attachments. Comments store Markdown text
only. Lists (and detail-composed comment arrays) are ordered **newest-first** — descending
`(created_at, id)`; pagination walks newest → oldest. Default `limit` is **50** (a typical thread
returns in one page). Labels are free-form and never dictionary-validated; `author_role` is likewise
never validated against `participant_roles`.

```typescript
// POST /stories/:storyId/comments
// POST /tasks/:taskId/comments
// POST /milestones/:id/comments          -> 201 Envelope<Comment> | 422, 404
// author_role is REQUIRED (non-empty) on every path. in_reply_to is a request-only input (a comment
// id) — never stored or returned as its own field; its only effect is the derived `ancestors` path.
interface CreateCommentBody {
  content: string;          // 1–50000, required
  author_role: string;      // required, non-empty
  labels?: Label[];
  in_reply_to?: string;     // optional parent comment id (same container); yields `ancestors`
}
// Create validation precedence: container exists (404) -> content non-empty & <=50000 (422)
//   -> author_role non-empty (422) -> in_reply_to comment exists (404) -> same container (422).
//   404 "Comment '{id}' not found."; 422 reply-cross-container:
//   "A reply must be on the same story, task, or milestone as the comment it replies to."

// GET  /stories/:storyId/comments
// GET  /tasks/:taskId/comments
// GET  /milestones/:id/comments
//   ?page&limit&label_key&label_value&after_id&descendant_of
//                                         -> 200 ListEnvelope<Comment> (newest-first) | 404
//   after_id      — keyset watermark: only comments strictly NEWER than the referenced comment,
//                   `(created_at, id) > (ref.created_at, ref.id)`; 404 if that comment is absent.
//   descendant_of — the sub-thread beneath the referenced comment (comments whose `ancestors`
//                   contains it). All filters combine, alone or together, under the new order.
// GET  /comments/:id                      -> 200 Envelope<Comment> | 404
// GET  /comments/:id/ancestors            -> 200 Comment[] (bare array, root-first, unpaginated) | 404
//   The ordered ancestor bodies for a comment (oldest ancestor -> direct parent); [] for a
//   top-level comment. A dangling ancestor id (parent since deleted) is silently skipped.
// PUT  /comments/:id                      -> 200 Envelope<Comment> | 422, 404
interface UpdateCommentBody { content?: string; labels?: Label[]; } // labels fully replaces;
//   author_role and ancestors are immutable — absent from this body, nothing to change.
//   Updating only content leaves labels unchanged and vice versa; an empty labels array clears all.
// DELETE /comments/:id                    -> 204 | 404
//   Hard delete (no archive/tombstone). Deleting a story/task/milestone cascades to its comments
//   (application-level — the container_id has no FK). A deleted comment's id may still linger in a
//   descendant's `ancestors`; readers degrade gracefully (the id is simply unresolvable).
```

> **Lineage traversal** is first-class in both directions: **up** via `GET /comments/:id/ancestors`
> (ordered ancestor bodies) and **down** via `?descendant_of=` on the list endpoint (the sub-thread).
> The thread is presentationally flat — no nesting or indentation — regardless of `ancestors` depth.

---

## Sessions

<!-- v1.8 (2026-07-30, STORY-009 reconcile): supersedes the LOCKED v1.0 forward-spec. Sessions are
     project-scoped; `status` is a fixed 3-value enum; completion is never derived from the result
     fields; `goal` is a required field; the two links are independent. See ADR-026 + ADR-027. -->

Every session **belongs to exactly one project** (`project_id`, required on create and on every list).
There is no cross-project session listing and no cross-project incomplete query. A session is
**incomplete** when its `status` is `pending` or `in-progress`, and **complete** when `finished` —
`status` is set explicitly and is never inferred from `result_decisions` / `result_summary`. The
unfinished-sessions query is simply `GET /sessions?project_id=…&incomplete=true` (a durable persisted
read — correct across server restarts with no special mechanism).

```typescript
// POST /sessions                          -> 201 Envelope<Session> | 422, 404 (project / linked ids)
interface CreateSession {
  project_id: string;                     // required — the owning project
  topic: string;                          // required, 1–500
  goal: string;                           // required, 1–500
  context?: string;
  participant_role: string;               // required; validated vs the project's effective participant_roles
  linked_story_id?: string;               // optional; must exist (404) and be in the same project (422)
  linked_task_id?: string;                // optional; independent of linked_story_id; same 404/422 rules
}
//   status is NOT a create input — every session is created at "pending". A `status` supplied in the
//   payload is accepted-and-ignored, not rejected. 404 if project_id / a linked id does not exist;
//   422 for topic/goal length, participant_role not in the dictionary, or a link in a different project.

// GET  /sessions?project_id&page&limit&incomplete&linked_story_id&include_archived
//                                         -> 200 ListEnvelope<Session> | 404 (unknown project_id)
//   project_id is REQUIRED (422 if omitted). Newest-first. `incomplete=true` -> status != finished.
//   `linked_story_id` filters to sessions linked to that story. The two filters are independently
//   combinable. Archived sessions are excluded unless `include_archived=true`. No `status`-value
//   filter; no symmetric `linked_task_id` filter (the index anticipates it as a future add).

// GET  /sessions/:id                      -> 200 Envelope<Session> | 404
// PUT  /sessions/:id                      -> 200 Envelope<Session> | 422, 404
//   Partial update. Omitted field -> unchanged. Explicit null clears context / result_decisions /
//   result_summary / linked_story_id / linked_task_id. topic / goal / participant_role / status are
//   mandatory: explicit null -> 422; a new value is re-validated (topic & goal 1–500; participant_role
//   vs the dictionary; status vs the fixed enum). status may move to any value in any direction (no
//   transition order). A newly-set link id is re-validated for existence + same-project.
interface UpdateSession {
  topic?: string; goal?: string; context?: string | null;
  status?: SessionStatus;                 // present-but-null -> 422; out-of-set -> 422
  participant_role?: string;
  result_decisions?: string | null; result_summary?: string | null;
  linked_story_id?: string | null; linked_task_id?: string | null;
}
// POST /sessions/:id/archive              -> 200 Envelope<Session> (archived_at set) | 400 (already), 404
//   400 message: "Session is already archived." An archived session stays fully updatable.
```

**Out-of-set status 422 example:**
`{ "error": "Value 'done' is not allowed. Allowed: pending, in-progress, finished.", "code": "VALIDATION_ERROR" }`

> **MCP.** Five tools mirror these one-to-one over the same service: `create_session`, `list_sessions`,
> `get_session`, `update_session`, `archive_session`. `list_sessions(project_id, incomplete=true)` is
> the orchestrator's cross-restart continuity query. REST and MCP are behaviour-identical, including
> error codes.

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
`(project_id, key)`, else `system_settings.values`. The same precedence applies to the scalar
`default_web_ui_role` (v1.7, STORY-008): its write is validated against the effective
`participant_roles` for the scope (422 if outside it); see the `default_web_ui_role` note in
§ Entities. It is accepted in the `PUT` body of both settings endpoints and returned by both `GET`
surfaces alongside the five dictionaries.

<!-- updated: 2026-07-13 (STORY-020 reconcile): `Settings`/`SettingsOverrides` are now heterogeneous —
     `link_types` returns/accepts `LinkTypeEntry[]`, all other keys stay `string[]` (see the
     Dictionary types above). Both surfaces (REST + MCP settings tools) honor the structured shape
     identically. Internally, effective-dictionary resolution used by TaskLink/StoryLink validation
     still yields `string[]` (the `value` fields) — the structured objects are exposed only through
     these settings responses. -->
The MCP settings tools (`get_system_settings`, `set_system_settings`,
`get_project_effective_settings`, `set_project_settings`, `clear_project_setting`) delegate to the
same service/schemas and therefore reflect the identical structured `link_types` shape, the scalar
`default_web_ui_role` (v1.7), and the same validation.

---

## Milestones

<!-- v1.2 (2026-07-10): single-project ownership + lifecycle status. Supersedes the LOCKED v1.0
     M:N (project_ids[]) shape. A milestone belongs to exactly one project and has a status. -->
<!-- updated: 2026-07-11 (STORY-012 reconcile): request schemas ratified without the `Body` suffix
     (`CreateMilestone`/`UpdateMilestone`) to match the codebase naming convention, as built. -->
<!-- updated: 2026-07-15 (STORY-007 reconcile): `GET /milestones/:id/detail` is now IMPLEMENTED —
     it composes the milestone's `attachments`; `comments` stays an empty array until STORY-008 builds
     that domain (same staging as story/task detail). All Milestone endpoints now match this contract. -->

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
//   Composes the milestone's side collections in one call. Assigned stories are NOT included —
//   they are paginated via GET /milestones/:id/stories.
interface MilestoneDetail extends Milestone {
  attachments: Attachment[];   // the milestone's attachments (composed since STORY-007)
  comments: Comment[];         // newest-first (composed since STORY-008)
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

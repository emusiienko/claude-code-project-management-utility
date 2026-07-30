# Backend Requirements

## Assumptions

The following assumptions were made where the validated idea or conceptual document left decisions open:

1. **Deployment** — Docker-based; the utility runs via Docker Compose on the developer's machine. Ports are mapped to localhost only — not exposed publicly. The database provider and storage technology are architecture decisions left to the architect; the product constraint is that the full stack runs on a single developer machine with no external cloud dependencies.
2. **Web UI scope for V1** — full CRUD for all entities and modules (confirmed in validated idea: "full CRUD access for the human orchestrator").
3. **Labels structure** — labels are an ordered array of `{key: string, value: string}` objects; `key` is always required; all keys are free-form.
4. ~~**Session status** — free-form string, not dictionary-validated (conceptual doc: "свободная метка" — free label).~~ <!-- updated: 2026-07-30 (STORY-009 reconcile): superseded. `status` shipped as a fixed three-value lifecycle enum (`pending` / `in-progress` / `finished`), deliberately **not** dictionary-validated — a session's lifecycle is fixed, not a per-project configurable set like `task_statuses`/`story_statuses`. Only the "not dictionary-validated" half of the original assumption held; "free-form string" did not. Separately, `participant_role` (a distinct field) turned out **not** to be free-form either — it is required and dictionary-validated against the project's effective `participant_roles`, the same convention as `default_web_ui_role` and task `assignee_role`/`creator_role`. See the Session entity below and api-contract v1.8 / ADR-026. -->
5. **Story statuses dictionary** — added as settings key `story_statuses`; the dedicated `status` field on Story is validated against this dictionary.
6. **Attachment file storage** — attachment content for the `document`, `image`, and `file` kinds is stored on the server filesystem, not as text in the database. This makes attached artifacts (plans, architecture docs, implementation reports, PDFs, spreadsheets) directly accessible as files on disk. The database stores metadata and a server-internal file path only. Attachments are immutable: each has exactly one stored file, written once at create and never overwritten — there is no update endpoint and no version history; changing content means deleting the attachment and creating a new one. For AI agents (MCP), document content is submitted as UTF-8 text in the request body for the document-as-text path, or as base64-encoded bytes (`content_base64` + `mime_type`) for any stored-file kind (image, file, or a document uploaded as a file) — the `get_attachment_file` MCP tool returns a stored file's bytes as base64 for reading. For the Web UI, file upload via multipart/form-data is used for all stored-file kinds. <!-- updated: 2026-07-14 (STORY-007 spec, api-contract v1.5) -->
7. **Authentication** — none; this is a single-developer personal tool. Docker port mapping to localhost is the access boundary — no auth layer required.

---

## Feature List

| Feature | Description | Priority |
|---------|-------------|----------|
| Project Management | CRUD for projects — the top-level namespace for all work items | P0 |
| Stories | Top-level work containers within a project; dedicated `status` field (dictionary-validated); free-form labels; on-demand aggregated task state | P0 |
| Tasks | Atomic work items within a story; `type`, `status`, `assignee_role`, `creator_role` from per-project dictionaries; validated at write | P0 |
| Settings Module | Configurable value dictionaries per project (task statuses, task types, story statuses, link types, participant roles); system defaults; project-level overrides; plus one scalar (non-list) key, `default_web_ui_role`, resolved with the same system-default + project-override precedence <!-- updated: 2026-07-15 (STORY-021: attachment_types retired — see STORY-021 section); updated: 2026-07-21 (STORY-008: default_web_ui_role scalar key added) --> | P0 |
| MCP Server | Full MCP protocol access surface exposing all operations for AI agents | P0 |
| Work Item Linking | Typed directed links between tasks (`task_links`) and between stories (`story_links`); same semantic model — typed, directed, same-project-only, passive; detail endpoints return enriched link lists with id, title, and status of the linked item | P1 |
| Attachments | Document (Markdown/text), image, and file (curated binary formats: PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP) attachments — stored on filesystem — plus external-reference attachments (URL + status) attached to stories, tasks, or milestones; immutable once created (a single stored file per attachment, no update, no version history); create + delete only, delete permanently removes every kind; agents get full base64 upload/download parity over MCP; every attachment carries a mandatory free-form `title` (defaults to the uploaded file name, editable; agents must supply it explicitly) — see STORY-021 | P1 |
| Comments | Markdown text notes attached to stories, tasks, or milestones; required-and-immutable `author_role`; free-form labels; a reply carries a persisted, immutable materialized ancestor path (`ancestors`); newest-first listing with a keyset `after_id` watermark and a `descendant_of` sub-thread filter; a dedicated lineage (ancestors) endpoint; the Web UI pre-fills `author_role` from a new `default_web_ui_role` setting — see STORY-008 <!-- updated: 2026-07-21 (STORY-008 reconcile) --> | P1 |
| Sessions Module | Project-scoped session records — a required start artifact (`topic`, `goal`, optional `context`), a required dictionary-validated `participant_role`, a fixed 3-value lifecycle `status` (`pending`/`in-progress`/`finished`, not dictionary-validated), two independent optional links to a story and/or task in the same project, and an optional result artifact (`result_decisions`/`result_summary`); a project-scoped incomplete-sessions query survives server restarts — see STORY-009 <!-- updated: 2026-07-30 (STORY-009 reconcile) --> | P1 |
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
| link_type | string | Yes | must match the `value` field of an entry in the parent story's project's effective `link_types` array | e.g. "depends-on", "context" |
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
| link_type | string | Yes | must match the `value` field of an entry in the source story's project's effective `link_types` array | e.g. "depends-on", "context" |
| created_at | timestamp | Yes | set on create | |

Unique constraint: (source_story_id, target_story_id, link_type).

---

### Attachment <!-- updated: 2026-07-15 (STORY-021 reconcile) -->

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| container_type | enum | Yes | "story" \| "task" \| "milestone"; immutable | |
| container_id | UUID | Yes | FK → Story, Task, or Milestone (per container_type); immutable | |
| title | string | Yes | 1–500 chars; free-form, not dictionary-validated; immutable after create | <!-- new: 2026-07-15 (STORY-021) --> defaults to the uploaded file's name for file-based create paths (Web UI); must be supplied explicitly for document-as-text, external-ref, and every MCP create path. Replaces the removed `type` field. |
| kind | enum | Yes | "document" \| "image" \| "file" \| "external-ref"; immutable | |
| mime_type | string | Cond. | required when kind = "document", "image", or "file"; e.g. "text/markdown", "image/png", "application/pdf" | stored; used as Content-Type when serving the file |
| file_size_bytes | integer | Cond. | required when kind = "document", "image", or "file"; set on upload/creation | |
| external_url | string | Cond. | required when kind = "external-ref"; max 2,000 chars; valid URI | |
| external_status | string | No | free-form; max 200 chars; "external-ref" kind only | user-defined state of the referenced artifact; e.g. "open", "merged", "deployed". Semantic meaning is caller-defined; the utility stores it without interpretation. |
| author_role | string | No | free-form; accepted on every create path (all kinds); immutable after create | descriptive metadata — who created the attachment; not access control |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

**File storage:** for `kind = "document"`, `kind = "image"`, and `kind = "file"`, the file content is stored on the server filesystem. A server-internal `file_path` is maintained but never exposed in API responses. There is exactly one stored file per attachment, written once at create. Attachments are immutable — there is no update endpoint and no version history. To change content, delete the attachment and create a new one.

---

### Comment <!-- updated: 2026-07-21 (STORY-008 reconcile) -->

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| container_type | enum | Yes | "story" \| "task" \| "milestone"; immutable | polymorphic, no FK (same convention as Attachment) |
| container_id | UUID | Yes | FK → Story, Task, or Milestone (per container_type); immutable | |
| author_role | string | Yes | free-form; **required and immutable after create** (was optional/nullable pre-STORY-008) | never validated against the `participant_roles` dictionary |
| content | text | Yes | 1–50,000 chars; Markdown | the only field besides `labels` that is updatable after create |
| labels | JSON array | No | array of `{key: string, value: string}`; all keys free-form | e.g. key="requires-action" |
| ancestors | JSON array | Yes | ordered (root-first) list of ancestor comment ids; `[]` for a top-level comment; immutable, derived once at create | the persisted materialized reply path — see ADR-023; FK-less, referential integrity not DB-enforced |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

Comments attach to Stories, Tasks, or Milestones — never to Attachments or to other Comments (a reply's relationship to its parent is expressed entirely through `ancestors`, not through a container reference).

**Reply lineage (`ancestors`):** a reply is an ordinary comment whose `ancestors` is computed once at create as `parent.ancestors + [parent.id]`; the direct parent is always `ancestors[-1]`. This is a deliberate architect override of an earlier schema-free "prepend a link to `content`" design once described for this feature — see ADR-023. The create request accepts an optional, **request-only** `in_reply_to` (a comment id) that is never itself stored or returned; only the derived `ancestors` list is. `content` is always stored exactly as submitted, with no server-added text. A dangling ancestor id (its comment since deleted) lingers harmlessly — readers degrade gracefully.

---

### Session <!-- updated: 2026-07-30 (STORY-009 reconcile) -->

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| id | UUID | Yes | PK, immutable | |
| project_id | UUID | Yes | FK → Project; CASCADE DELETE; immutable | the owning project — a session always belongs to exactly one project |
| topic | string | Yes | 1–500 chars; updatable; cannot be cleared (explicit `null` → 422) | start artifact: a brief, at-a-glance label for the session |
| goal | string | Yes | 1–500 chars; updatable; cannot be cleared (explicit `null` → 422) | start artifact: the concrete purpose the session was created to accomplish |
| context | text | No | max 50,000 chars; clears on explicit `null` | start artifact: general background information |
| status | string (fixed enum) | Yes | one of `"pending"`, `"in-progress"`, `"finished"`; server default `"pending"`; **not** dictionary-validated; not accepted as a creation input — every session starts at `pending` regardless of the create payload | fixed lifecycle enum; settable to any of the three values via update, in any direction, at any time; never inferred from `result_decisions`/`result_summary` |
| participant_role | string | Yes | from the project's effective `participant_roles` dictionary; updatable; cannot be cleared (explicit `null` → 422) | descriptive metadata, not access control |
| result_decisions | text | No | max 50,000 chars; null until set; clears on explicit `null` | result artifact: decisions made — purely informational, never affects `status` |
| result_summary | text | No | max 50,000 chars; null until set; clears on explicit `null` | result artifact: summary — purely informational, never affects `status` |
| linked_story_id | UUID | No | FK → Story; SET NULL on Story delete (application-level — see Relationships); must belong to the same `project_id` as the session; clears on explicit `null` | independent optional cross-module reference; neither a substitute for `linked_task_id` nor for `project_id` |
| linked_task_id | UUID | No | FK → Task; SET NULL on Task delete (application-level — see Relationships); must belong to the same `project_id` as the session; clears on explicit `null` | independent optional cross-module reference; neither a substitute for `linked_story_id` nor for `project_id` |
| archived_at | timestamp | No | null = active; non-null = archived | archiving does not restrict any later update |
| created_at | timestamp | Yes | set on create | |
| updated_at | timestamp | Yes | set on update | |

A session is **incomplete** when its `status` is `pending` or `in-progress`, and **complete** when
`finished`. `status` is always set explicitly — it is never derived from `result_decisions` /
`result_summary` being null or non-null: a session can reach `finished` with both result fields still
null, and can remain `pending` or `in-progress` after both have been filled in.

Every session belongs to exactly one project (`project_id`) — there is no project-less session and no
cross-project session listing or incomplete-sessions query; every session read is scoped to a chosen
`project_id`. `linked_story_id` and `linked_task_id` are two entirely independent optional fields —
either, both, or neither may be set; neither is ever a substitute for the other or for the mandatory
project scope.

<!-- as-built note (STORY-009): this entity supersedes an earlier forward-spec draft that described
sessions as project-less, `status` as a free-form string, and completion as derived from both result
fields being null (briefly via an interim `is_complete` boolean during implementation). All three were
replaced before acceptance. See api-contract v1.8, ADR-026 (project scope + fixed status enum), ADR-027
(Sessions as a distinct Web UI app mode). -->

---

### SystemSettings <!-- updated: 2026-07-15 (STORY-021: attachment_types retired); updated: 2026-07-21 (STORY-008: default_web_ui_role scalar key added) -->

One row per settings key. Pre-seeded at install time; updatable.

> **STORY-021:** The `attachment_types` key is removed. It had exactly one consumer — the
> Attachment `type` field — which is itself removed in favor of a free-form `title`. Five dictionary
> keys remain.
>
> **STORY-008:** A sixth key, `default_web_ui_role`, is added — the first (and so far only) **scalar**
> key in the store: its `values` cell holds a single bare string, not an array. It is resolved with
> the same system-default + project-override precedence as the five dictionaries, but validated
> differently — see the dedicated note below the pre-seeded defaults table.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| key | string | Yes | PK; one of the five dictionary keys or the one scalar key below | |
| values | JSON array \| JSON scalar | Yes | see per-key format below; dictionaries: array, min 1 item; `default_web_ui_role`: a single non-empty string | format is heterogeneous: `link_types` is `LinkTypeEntry[]`; the other four dictionary keys are `string[]`; `default_web_ui_role` is a bare `string` |
| updated_at | timestamp | Yes | set on update | |

**LinkTypeEntry** — the structured format used exclusively for `link_types` values:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| value | string | Yes | 1–200 chars; non-empty; used as the machine key everywhere a `link_type` is stored or validated |
| outbound | string | Yes | 1–200 chars; non-empty; display label shown when the viewed item is the source |
| inbound | string | Yes | 1–200 chars; non-empty; display label shown when the viewed item is the target |

Symmetric entries (`outbound == inbound`, e.g. `"context"`) are valid.

**Pre-seeded system defaults:**

| key | default values |
|-----|----------------|
| task_statuses | `["todo", "in-progress", "done"]` |
| task_types | `["task", "bug", "testing-task"]` |
| story_statuses | `["planned", "in-progress", "pending-approval", "accepted"]` |
| link_types | `[{"value":"depends-on","outbound":"depends on","inbound":"dependent"},{"value":"dependent","outbound":"dependent","inbound":"depends on"},{"value":"created-by","outbound":"created by","inbound":"creates"},{"value":"creates","outbound":"creates","inbound":"created by"},{"value":"context","outbound":"context","inbound":"context for"}]` |
| participant_roles | `["orchestrator", "architect", "backend-developer", "frontend-developer", "devops", "spec-writer", "qa-automation", "manual-qa", "operator"]` <!-- updated: 2026-07-21 (STORY-008): "operator" added — the human orchestrator driving the Web UI, distinct from the "orchestrator" agent-coordination role. As an ordinary dictionary entry it is thereafter selectable anywhere `participant_roles` is used (task `assignee_role`/`creator_role`, `@role` mentions, the default Web UI role setting) --> |
| default_web_ui_role (scalar) | `"operator"` <!-- new: 2026-07-21 (STORY-008) --> |

**`default_web_ui_role`** (STORY-008): a single-value setting, not a list — stored as a bare JSON
string in the same `(key, values)` row mechanism as the five dictionaries, and resolved with the same
system-default + project-override precedence (a project override fully replaces the system value; no
merging). It supplies the value the Web UI's Add Comment form pre-fills into a new comment's
`author_role`; the comment's own `author_role` is never re-validated against it. On write it must be
non-empty and a member of the effective `participant_roles` for that scope (system `participant_roles`
for a system-level write; the project's effective set for a project override) — **422** otherwise:
"Value '{v}' is not allowed. Allowed: {list}." It is never re-validated on read, so an inherited system
default can legitimately sit outside a project's later-overridden `participant_roles` set — this is
benign, since a comment's own `author_role` is free-form. This is deliberately named and scoped
generically (not "comment author role") so a future story can point another entity's author/creator
field at the same setting without introducing a second one; STORY-008 is its first and, for now, only
consumer.

> **As-built notes (STORY-020):** `link_types` changed from a flat string array to a `LinkTypeEntry[]` array in migration `0008_link_types_structured`. The migration converts existing flat-string entries to structured objects (best-effort: `"depends-on"` → `{"value":"depends-on","outbound":"depends-on","inbound":"depends-on"}`); the five canonical slugs receive their correct directional labels. Migration seed in `0002_settings` was updated so fresh installs start with the five canonical structured defaults. The migration is reversible: downgrade converts structured objects back to flat strings using only the `value` field. See ADR-019.
>
> **STORY-021:** The `attachment_types` key (formerly `["plan", "document", "image", "implementation-report", "test-result", "external-ref"]`) and its row are removed from both `SystemSettings` and `ProjectSettings` — no field consumes it anymore.

---

### ProjectSettings <!-- updated: 2026-07-13 (STORY-020 reconcile); updated: 2026-07-21 (STORY-008: default_web_ui_role scalar key added) -->

One row per (project, key) pair. Absent rows fall through to system defaults.

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| project_id | UUID | Yes | FK → Project; composite PK (project_id, key) | |
| key | string | Yes | same six keys as SystemSettings (five dictionaries + the `default_web_ui_role` scalar); composite PK | <!-- updated: 2026-07-15 (STORY-021: attachment_types retired); updated: 2026-07-21 (STORY-008: default_web_ui_role scalar key added) --> |
| values | JSON array \| JSON scalar | Yes | see per-key format (same heterogeneous rule as SystemSettings); dictionaries: min 1 item; `default_web_ui_role`: a single non-empty string | completely replaces (does not merge with) the system default for that key |
| updated_at | timestamp | Yes | set on update | |

**Effective dictionary resolution:** for each key, if a ProjectSettings row exists for `(project_id, key)`, its `values` is used; otherwise the SystemSettings row for that `key` is used.

For `link_types`, the `EffectiveDictionary.resolve()` Protocol returns only the extracted `value` strings (not the full `LinkTypeEntry` objects) so that `TaskLinkService` and `StoryLinkService` can compare `link_type` against a plain `list[str]` — behavior unchanged from their perspective. The structured data is exposed only through settings response schemas.

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
| Story → Comment (container_type = story) | 1:N | CASCADE (application-level — see STORY-008) <!-- updated: 2026-07-21 (STORY-008 reconcile) --> |
| Task → Attachment (container_type = task) | 1:N | CASCADE |
| Task → Comment (container_type = task) | 1:N | CASCADE (application-level — see STORY-008) <!-- updated: 2026-07-21 (STORY-008 reconcile) --> |
| Milestone → Attachment (container_type = milestone) | 1:N | CASCADE <!-- updated: 2026-07-14 (STORY-007 spec) --> |
| Milestone → Comment (container_type = milestone) | 1:N | CASCADE (application-level — see STORY-008) <!-- new: 2026-07-21 (STORY-008 reconcile) --> |
| Task → TaskLink (source or target) | 1:N | CASCADE (link deleted when either task is deleted) |
| Story → StoryLink (source or target) | 1:N | CASCADE (link deleted when either story is deleted) |
| Project → ProjectSettings | 1:N | CASCADE |
| Project → Session | 1:N | CASCADE (all of a project's sessions are deleted when the project is deleted) <!-- new: 2026-07-30 (STORY-009 reconcile) --> |
| Session → Story (linked_story_id) | N:0-1 | SET NULL (application-level — the SQLite FK is inert; see ADR-018 pattern) <!-- updated: 2026-07-30 (STORY-009 reconcile) --> |
| Session → Task (linked_task_id) | N:0-1 | SET NULL (application-level — same as above, independent of the story link) <!-- updated: 2026-07-30 (STORY-009 reconcile) --> |
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
| Attachment | (container_type, container_id, kind) | attachments per container filtered by kind <!-- updated: 2026-07-15 (STORY-021: was filtered by type, now type is removed) --> |
| Comment | (container_type, container_id, created_at) | comment thread per container, scanned descending for the newest-first list <!-- updated: 2026-07-21 (STORY-008 reconcile): list ordering flipped to newest-first --> |
| Session | (project_id, created_at) | project-scoped newest-first session list <!-- updated: 2026-07-30 (STORY-009 reconcile): replaces the stale forward-spec `(archived_at, result_decisions)` index — sessions are project-scoped, not queried globally --> |
| Session | (project_id, status) | project-scoped incomplete query (`status != 'finished'`) <!-- updated: 2026-07-30 (STORY-009 reconcile) --> |
| Session | (linked_story_id) | sessions linked to a story; also backs the `linked_story_id` list filter and the reference-clearing update on story delete |
| Session | (linked_task_id) | sessions linked to a task; also backs the reference-clearing update on task delete |
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

#### GET /stories/:id/detail <!-- updated: 2026-07-02 (STORY-001 reconcile); updated: 2026-07-13 (STORY-006: links added); updated: 2026-07-15 (STORY-007 reconcile: attachments populated) -->

> **As-built notes (STORY-006):**
> - The route was added in STORY-006 TASK-003 alongside the `StoryDetail` schema (`StoryDetail(Story)` Pydantic model in `stories/schema.py`). The endpoint is registered in `stories/controller.py` before the existing `/aggregate` route, and mirrored as the `get_story_detail` MCP tool.
> - `links` is populated by `StoryService.get_detail` via the injected `StoryLinkReaderProtocol`; returns `[]` when the reader is not wired.
> - **BUG-001 fix (2026-07-13):** `LinkedStorySummary.status` is declared `str | None` (nullable). The original spec described `status` as a string; however `story.status` is nullable, causing a 500 when any linked story has no status. The fix is a one-line type change in `story_links/schema.py`. All enriched story-link responses must tolerate `null` in the `status` field.
> - **As-built notes (STORY-007):** `attachments` is now populated by `StoryService.get_detail` via the injected `AttachmentReader` Protocol (mirrors the `StoryLinkReaderProtocol` pattern) — no longer an empty placeholder array.
> - **As-built notes (STORY-008):** `comments` is now populated (newest-first) via an injected `CommentReaderProtocol`, closing the previously-empty placeholder array.

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
      "comments": [ Comment objects, newest-first ]
    }
  }
  ```
  Composite read — story entity plus its outbound and inbound story links (enriched with `id`, `title`, and nullable `status` of the linked story), active attachments, and comments (newest-first, see STORY-008). Large child collections (tasks) are excluded and served by their own paginated endpoint.
- **Response errors:** 404

---

### Tasks <!-- updated: 2026-07-12 (STORY-005 reconcile) -->

> **As-built notes (STORY-005):**
> - Invalid UUID path params (`:storyId`, `:id`) return 404 (string→UUID coercion via ADR-011 — consistent with projects and stories domains).
> - The controller uses two separate routers: `stories_router` for `POST /stories/{story_id}/tasks` and `GET /stories/{story_id}/tasks`; `tasks_router` for `GET/PUT/DELETE /tasks/{task_id}` and `GET /tasks/{task_id}/detail`.
> - `PUT /tasks/:id` omitting `assignee_role` or `creator_role` leaves the current value unchanged. Sending `null` clears the field (always allowed — not dictionary-validated when clearing). The `"field" in data.model_fields_set` guard ensures null-clearing and omission remain distinct.
> - `PUT /tasks/:id` with `story_id` in the body is silently ignored (`UpdateTask` schema does not declare it). The owning story never changes.
> - `GET /tasks/:id/detail` `links` field is populated by STORY-006 (TASK-003) via the injected `TaskLinkReaderProtocol`. `attachments` is populated by STORY-007 (TASK-003) via the injected `AttachmentReader` Protocol. `comments` is populated (newest-first) by STORY-008 via the injected `CommentReaderProtocol`.
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
      "comments": [ Comment objects, newest-first ]
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

### Attachments <!-- updated: 2026-07-15 (STORY-021 reconcile: type replaced by title) -->

Attachments are immutable once created — there is no update endpoint and no archive; the lifecycle is create + delete only. Attachments of `kind = "document"`, `kind = "image"`, or `kind = "file"` are stored as files on the server filesystem. The create endpoint accepts either `application/json` (for programmatic/MCP use) or `multipart/form-data` (for file uploads from the Web UI). Attachments may be attached to a story, task, or milestone (`container_type`).

> **As-built notes (STORY-007):**
> - `container_id` carries **no foreign key** — it is a polymorphic reference across three tables (story/task/milestone); container existence is validated in the service layer, not the DB. Cascade removal on container delete is application-level (extends the ADR-018 app-cascade precedent to a no-FK polymorphic association — see ADR-020).
> - Cross-domain container reads and cascade delete are implemented via an `AttachmentReader` Protocol injected into the story, task, and milestone services, mirroring the task-links/story-links precedent.
> - `GET /attachments/:id/file` reads the whole file into memory before streaming the response (acceptable at the 10 MB cap; would need revisiting if the limit grows).

> **As-built notes (STORY-021):** `type` (formerly validated against the `attachment_types`
> dictionary) is removed from every create path and response. `title` (mandatory, free-form, 1–500
> chars) takes its place. For file-based create paths (multipart upload from the Web UI), omitting
> `title` defaults it to the uploaded file's name, truncated to 500 chars; the caller may still supply
> `title` explicitly to override the default in the same request. Every other create path
> (document-as-text JSON, external-ref JSON, and every MCP argument shape) requires `title` explicitly
> — there is no default to fall back to. Built exactly as planned; confirmed by automated tests
> (72 rewritten attachment tests + 11 new migration tests, 0 failures). Two as-built clarifications
> surfaced by QA are documented at the Settings and list-endpoint notes below: (1) sending the retired
> `attachment_types` key to a settings `PUT` returns **422**, not 400; (2) the MCP `list_attachments`
> tool raises a hard error on a stale `type` keyword argument rather than silently ignoring it, unlike
> the REST list endpoints. See api-contract v1.6.

#### POST /stories/:storyId/attachments
#### POST /tasks/:taskId/attachments
#### POST /milestones/:milestoneId/attachments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **`kind = document` via JSON:** `{ "title": "string (required, 1–500 chars)", "kind": "document", "content": "string", "mime_type": "text/markdown|text/plain", "author_role" }`
- **`kind = document`, `image`, or `file` via multipart:** fields `title` (optional — defaults to the uploaded file's name if omitted), `kind`, `mime_type`, `author_role` + `file` binary
- **`kind = external-ref` via JSON:** `{ "title": "string (required, 1–500 chars)", "kind": "external-ref", "external_url": "string", "external_status", "author_role" }`
- `author_role` is optional on every create path, for every kind; stored immutably once set.
- `title` is immutable after create, exactly like every other attachment field (no update endpoint).
- **Per-kind MIME allow-list:** document: `text/markdown`, `text/plain`; image: `image/png`, `image/jpeg`, `image/gif`, `image/webp`; file: `application/pdf`, `application/vnd.openxmlformats-officedocument.*` (docx/xlsx/pptx), `text/csv`, `text/plain`, `application/json`, `application/zip`
- **Size limit:** 10 MB for every stored-file kind (document, image, file)
- **MCP create surface (agents):** document-as-text and external-ref via plain JSON args; image, file, and a document uploaded **as a file** (rather than inline text) via a base64 argument `{ title, kind, mime_type, content_base64, author_role? }`. **`title` is a required argument on every MCP create tool, with no default** — the tool decodes the base64 onto the same service path as the REST multipart route, but there is no file name available in a base64 payload to default from, so the calling agent must always supply it. Same per-kind MIME allow-list and 10 MB limit apply; binary never crosses MCP except as base64, one file per call.
- **Response 201:** `{ "data": { Attachment } }`
- **Response errors:**
  - 400: file > 10 MB; unsupported MIME type for the kind; external_url is not a valid URI (non-Pydantic business checks)
  - 404: container (story, task, or milestone) not found
  - 422: required fields missing (Pydantic) — including `title` missing/empty on every path where it is required

#### GET /stories/:storyId/attachments
#### GET /tasks/:taskId/attachments
#### GET /milestones/:milestoneId/attachments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page`, `limit`, `kind` <!-- updated: 2026-07-15 (STORY-021): `type` filter removed along with the field -->
- **Response 200:** paginated Attachment list
- **Response errors:** 404

> **As-built notes (STORY-021):** A stale `?type=` query param on these REST list endpoints is
> silently ignored (unknown query params are dropped by the framework) — not an error. The MCP
> `list_attachments` tool behaves differently: it no longer declares a `type` keyword argument at all,
> so passing one raises a schema-level tool error (`ToolError: Unexpected keyword argument`) instead of
> being silently ignored. This is an inherent transport difference — MCP tool calls are strict,
> Pydantic-validated RPC, while REST query strings are lenient — not a REST/MCP parity gap to close.

#### GET /attachments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Attachment } }` (metadata only)
- **Response errors:** 404

#### GET /attachments/:id/file
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** raw file with `Content-Type` matching `mime_type` (document, image, or file kind)
- **Response errors:**
  - 400: `kind = external-ref` → `{ "error": "External reference attachments do not have a stored file.", "code": "VALIDATION_ERROR" }`
  - 404

**MCP-only:** `get_attachment_file(id) -> { mime_type, content_base64 }` — returns the stored file's bytes as base64 for `document` / `image` / `file`, so agents can read attachment content (e.g. a PDF or an existing document) without an HTTP fetch. Errors if `kind = external-ref` (no stored file) or the attachment is not found. No REST equivalent beyond `GET /attachments/:id/file`.

#### DELETE /attachments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** deletable for **every** kind. Removes the DB row and, for document/image/file, the stored file from disk; external-ref has no stored file, so only its row is removed.
- **Response 204**
- **Response errors:** 404

---

### Comments <!-- updated: 2026-07-21 (STORY-008 reconcile) -->

Comments attach to stories, tasks, or milestones (`container_type`). Lists (and detail-composed
`comments` arrays) are ordered **newest-first** — descending `(created_at, id)`; pagination walks
newest → oldest. Default `limit` is **50** (a typical thread returns in one page). Labels are
free-form and never dictionary-validated; `author_role` is likewise never validated against
`participant_roles`.

> **As-built notes (STORY-008):** `author_role` is now **required and immutable** (was optional in
> the pre-STORY-008 forward-spec placeholder). A reply is modeled as a persisted, immutable
> materialized ancestor path (`ancestors`) rather than as text prepended to `content` — a deliberate
> architect override of an earlier schema-free design (see ADR-023); the create-time `in_reply_to`
> input is request-only and never itself stored or returned. List ordering was flipped to newest-first
> after initial acceptance testing (a product decision, no ADR). See `docs/architecture.md` §
> Known Divergences for the full list of as-built vs. originally-specified behavior.

#### POST /stories/:storyId/comments
#### POST /tasks/:taskId/comments
#### POST /milestones/:milestoneId/comments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:**
  ```json
  {
    "content": "string (required, 1–50000 chars)",
    "author_role": "string (required, non-empty)",
    "labels": [ { "key": "string", "value": "string" } ],
    "in_reply_to": "uuid (optional — another comment's id, request-only, never stored as its own field)"
  }
  ```
- **Response 201:** `{ "data": { Comment } }` — `ancestors` is `[]` unless `in_reply_to` was supplied
- **Validation precedence:** container exists (404) → `content` non-empty and ≤ 50,000 chars (422) →
  `author_role` non-empty (422) → when `in_reply_to` is supplied: the referenced comment exists (404)
  and shares the same container as the comment being created (422). On a valid reply,
  `ancestors = parent.ancestors + [parent.id]` is computed and persisted; `content` is stored exactly
  as submitted, with no server-added text.
- **Response errors:**
  - 404: container not found; or `in_reply_to` references a comment that does not exist → `{ "error": "Comment '{id}' not found.", "code": "NOT_FOUND" }`
  - 422: `content` missing/empty/over-length or `author_role` missing/empty (Pydantic field validation); `in_reply_to` references a comment in a different container → `{ "error": "A reply must be on the same story, task, or milestone as the comment it replies to.", "code": "UNPROCESSABLE" }`

#### GET /stories/:storyId/comments
#### GET /tasks/:taskId/comments
#### GET /milestones/:milestoneId/comments
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `page` (default 1), `limit` (default 50, max 100), `label_key`, `label_value`, `after_id`, `descendant_of`
  - `after_id` (comment id, optional) — keyset watermark: returns only comments created strictly **after** (newer than) the referenced comment — `(created_at, id) > (ref.created_at, ref.id)`. Orthogonal to display order; the matched set is still returned newest-first. 404 if the referenced comment does not exist (including if it was since deleted).
  - `descendant_of` (comment id, optional) — returns the sub-thread beneath the referenced comment (every comment whose `ancestors` contains it).
  - All filters combine freely, alone or together.
- **Response 200:** paginated Comment list, **newest-first**
- **Response errors:** 404 (container not found; or `after_id`/`descendant_of` references a comment that does not exist)

#### GET /comments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Comment } }`
- **Response errors:** 404

#### GET /comments/:id/ancestors
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": [ Comment, ... ] }` — a **bare, unpaginated array**, ordered root-first (oldest ancestor → direct parent); `[]` for a top-level comment. A dangling ancestor id (its comment since deleted) is silently skipped. This lineage order is unaffected by the newest-first Revision — it is a lineage path, not a chronological list.
- **Response errors:** 404 (comment not found)

#### PUT /comments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `content`, `labels` — optional; `labels` fully replaces when provided; `author_role` and `ancestors` are not fields on this body — any value supplied for either is silently ignored (both immutable)
- **Response 200:** `{ "data": { Comment } }`
- **Response errors:** 404, 422 (content out of range — Pydantic)

#### DELETE /comments/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** hard delete — no archive or tombstone. Deleting a story, task, or milestone cascades to its comments (application-level — the polymorphic `container_id` has no FK). A deleted comment's id may still linger in a descendant's `ancestors`; readers degrade gracefully (the id is simply unresolvable, and a standalone permalink to the deleted comment has no surviving container to resolve to — see the Web UI requirements for the resulting fallback behavior).
- **Response 204**
- **Response errors:** 404

**MCP tools** (behavior-identical mirror): `create_comment`, `list_comments`, `get_comment`, `get_comment_ancestors`, `update_comment`, `delete_comment`. Create/list take `container_type` + `container_id` as arguments (rather than a path); `list_comments` accepts the same filters (`page`, `limit`, `label_key`, `label_value`, `after_id`, `descendant_of`); `create_comment` carries the same fields as the REST create body, including the optional `in_reply_to`.

---

### Sessions <!-- updated: 2026-07-30 (STORY-009 reconcile) -->

Every session belongs to exactly one project. There is no cross-project session listing and no
cross-project incomplete-sessions query. A session is **incomplete** when its `status` is `pending` or
`in-progress`, and **complete** when `finished` — `status` is always set explicitly, never derived from
`result_decisions`/`result_summary`. The unfinished-sessions query is
`GET /sessions?project_id=…&incomplete=true`, a durable persisted read (correct across server
restarts, no special mechanism).

> **As-built notes (STORY-009):** this section supersedes the pre-existing project-less,
> free-form-`status`, interim-`is_complete`-boolean forward-spec entirely. `topic` was also considered
> immutable at one point during the story's amendments; it shipped updatable, like every other
> mandatory-but-non-clearable field. See api-contract v1.8, ADR-026 (project scope + fixed status
> enum), ADR-027 (Sessions as a distinct Web UI app mode).

#### POST /sessions
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:**
  ```json
  {
    "project_id": "uuid (required)",
    "topic": "string (required, 1–500 chars)",
    "goal": "string (required, 1–500 chars)",
    "context": "string (optional)",
    "participant_role": "string (required, from participant_roles dict)",
    "linked_story_id": "uuid (optional)",
    "linked_task_id": "uuid (optional)"
  }
  ```
  `status` is not a creation field — every session is created at `status: "pending"`. A `status` value
  supplied in the payload is accepted and silently ignored, not rejected.
- **Response 201:** `{ "data": { Session } }` — `status: "pending"`; `result_decisions`/`result_summary` null
- **Response errors:**
  - 404: `project_id` does not reference an existing project; a supplied `linked_story_id`/`linked_task_id` does not reference an existing story/task
  - 422: `topic`/`goal` missing or out of range (Pydantic); `participant_role` missing or not in the project's effective `participant_roles` dict → `{ "error": "Value '{v}' is not allowed. Allowed: {list}.", "code": "UNPROCESSABLE" }`; a linked story/task belongs to a different project than `project_id`

#### GET /sessions
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Query params:** `project_id` (**required**), `page`, `limit`, `incomplete` (bool — `status` is `pending` or `in-progress`), `linked_story_id` (filter to sessions linked to a specific story), `include_archived` (bool, default: false)
- **Response 200:** paginated Session list, newest-first, scoped to `project_id`
- **Response errors:** 422 (missing `project_id`), 404 (`project_id` does not reference an existing project)
- **Note:** `incomplete` and `linked_story_id` are independently combinable. There is no `status`-value filter and no symmetric `linked_task_id` filter (a future addition the link indexes already anticipate).

#### GET /sessions/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Session } }`
- **Response errors:** 404

#### PUT /sessions/:id
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** `topic`, `goal`, `context`, `status`, `participant_role`, `result_decisions`, `result_summary`, `linked_story_id`, `linked_task_id` — all optional; an omitted field is left unchanged
- **Response 200:** `{ "data": { Session } }`
- **Response errors:**
  - 404: session not found; a newly-set `linked_story_id`/`linked_task_id` does not reference an existing story/task
  - 422: explicit `null` on `topic`, `goal`, `participant_role`, or `status` (all four are mandatory and cannot be cleared); a new `topic`/`goal` out of range; a new `participant_role` not in the effective dictionary; a new `status` outside the fixed set → `{ "error": "Value '{v}' is not allowed. Allowed: pending, in-progress, finished.", "code": "UNPROCESSABLE" }`; a newly-set link belonging to a different project than the session
- **Note:** `context`, `result_decisions`, `result_summary`, `linked_story_id`, `linked_task_id` clear on explicit `null`. `status` may move to any of the three values from any other value, in any direction, at any time — no transition order is enforced. `result_decisions`/`result_summary` never affect `status`, in any combination.

#### POST /sessions/:id/archive
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { Session } }` with `archived_at` set
- **Response errors:** 400 (already archived → `{ "error": "Session is already archived.", "code": "VALIDATION_ERROR" }`), 404
- **Note:** an archived session stays fully updatable — archiving does not restrict any later update.

**MCP tools** (behavior-identical mirror): `create_session`, `list_sessions`, `get_session`,
`update_session`, `archive_session`. `list_sessions(project_id, incomplete=true)` is the orchestrator's
cross-restart continuity query, scoped to the current project.

---

### Settings <!-- updated: 2026-06-30 (STORY-002 reconcile); updated: 2026-07-13 (STORY-020: link_types structured); updated: 2026-07-15 (STORY-021: attachment_types retired); updated: 2026-07-21 (STORY-008: default_web_ui_role scalar key added) -->

> **As-built notes (STORY-020):** Settings responses are now **heterogeneous** — `link_types` is returned and accepted as `LinkTypeEntry[]`; the other four keys remain plain `string[]`. The MCP tools (`get_system_settings`, `set_system_settings`, `get_project_effective_settings`, `set_project_settings`, `clear_project_setting`) mirror this shape; validation for `link_types` delegates entirely to the service layer. See ADR-019.
>
> **As-built notes (STORY-021):** `attachment_types` is removed — it had no consumer once the
> Attachment entity's `type` field was replaced by a free-form `title`. Five dictionary keys remain:
> `task_statuses`, `task_types`, `story_statuses`, `link_types`, `participant_roles`. A `PUT` request
> including `attachment_types` (or any other unrecognized key) is rejected as an unknown key with
> **422**, not 400 — the existing unknown-key rejection is a Pydantic `model_validator` that FastAPI
> surfaces as 422 for every dictionary key, not a status this story changed. The error line below is
> corrected accordingly; see api-contract v1.6.
>
> **As-built notes (STORY-008):** A sixth key, `default_web_ui_role`, is added — a single **scalar**
> string, not a list, the first settings key shaped that way. On write it must be non-empty and a
> member of the effective `participant_roles` for that scope; **422** otherwise:
> "Value '{v}' is not allowed. Allowed: {list}." It is accepted in the `PUT` body of both settings
> endpoints and returned by both `GET` surfaces alongside the five dictionaries; the MCP settings tools
> mirror it identically. See ADR-022.

#### GET /system/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** `{ "data": { task_statuses: string[], task_types: string[], story_statuses: string[], link_types: LinkTypeEntry[], participant_roles: string[], default_web_ui_role: string } }`

#### PUT /system/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** partial — only provided keys updated; `link_types` must be `LinkTypeEntry[]` (plain strings → 422); the four other dictionary keys must be `string[]`; `default_web_ui_role` must be a non-empty string that is a member of the effective `participant_roles`
- **Response 200:** `{ "data": { all system settings } }`
- **Response errors:** 400 (empty values array; duplicate `link_types` value); 422 (unknown key — e.g. the retired `attachment_types` key, rejected by the same Pydantic `model_validator` as any other unknown key, not 400 <!-- corrected: 2026-07-15 (STORY-021 reconcile) -->; plain string in `link_types`; missing/blank `LinkTypeEntry` field; `default_web_ui_role` empty or not in the effective `participant_roles`)

#### GET /projects/:projectId/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** project-level overrides only; `{}` if none set; `link_types` override (if set) is `LinkTypeEntry[]`; `default_web_ui_role` override (if set) is a bare string
- **Response errors:** 404

#### GET /projects/:projectId/settings/effective
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:** merged effective settings for all six keys; `link_types` is `LinkTypeEntry[]`; `default_web_ui_role` is a bare string
- **Response errors:** 404

#### PUT /projects/:projectId/settings
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Request body:** partial settings object; same heterogeneous format as PUT /system/settings
- **Response 200:** `{ "data": { effective settings after update } }`
- **Response errors:** 400 (empty values; duplicate `link_types` value), 404; 422 (unknown key — same Pydantic rejection as system settings, not 400 <!-- corrected: 2026-07-15 (STORY-021 reconcile) -->; Pydantic validation on `link_types`; `default_web_ui_role` empty or not in the project's effective `participant_roles`)

#### DELETE /projects/:projectId/settings/:key *(not yet implemented — see Known Gaps)*
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Behavior:** removes the project-level override for the given key; effective value reverts to system default; other keys' overrides are unaffected; clearing a key with no override is a no-op
- **Response 204:** no body
- **Response errors:** 404 (project not found or key not a valid dictionary key)
- **Status:** the backend service implements `clear_project_setting`; no REST route or MCP tool exposes it as of STORY-002; the frontend calls this endpoint and receives an error at runtime. The new `default_web_ui_role` scalar key (STORY-008) inherits this gap unchanged — its "Clear override" control is wired identically to the five dictionaries and fails the same way; the only end-to-end coverage of clear-override (any key) is via the MCP `clear_project_setting` tool.

---

### Milestones <!-- updated: 2026-07-11 (STORY-012 reconcile); updated: 2026-07-15 (STORY-007 reconcile: detail endpoint added) -->

> **As-built notes (STORY-012):** The previously planned M:N (milestone ↔ project) model was replaced with a single-project model before implementation. Each milestone carries a `project_id` FK (not a join table). A `status` lifecycle field was added (`planned` / `active` / `finished`). Lifecycle transitions are exposed as action endpoints (POST activate / POST finish), not via PUT. `story_count` is a server-derived field present on both list and detail responses. `container_type = "milestone"` for attachments was deferred at STORY-012 time and implemented in STORY-007; comments followed in STORY-008 — milestones now support both side collections identically to stories and tasks.

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

#### GET /milestones/:id/detail <!-- added: 2026-07-15 (STORY-007 reconcile) -->
- **Auth:** none  **Rate limit:** 1,000 req/min
- **Response 200:**
  ```json
  {
    "data": {
      "...all Milestone fields, plus story_count...",
      "attachments": [ active Attachment objects ],
      "comments": [ Comment objects, newest-first ]
    }
  }
  ```
  Composite read — milestone entity plus its attachments and comments (newest-first). Assigned stories are not included — they are paginated via `GET /milestones/:id/stories`.
- **Response errors:** 404

> **As-built notes (STORY-007):** This endpoint did not exist prior to STORY-007; it closes the Known Divergence left open at STORY-012 (deferred pending the attachments domain). `attachments` is populated via the same injected `AttachmentReader` Protocol used by the Story and Task detail endpoints.
> **As-built notes (STORY-008):** `comments` is now populated (newest-first) via an injected `CommentReaderProtocol`, fully closing the `GET /milestones/:id/detail` Known Divergence — both side collections are now live on all three detail views.

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
| TaskLink | link_type | Required; must match the `value` field of an entry in the effective `link_types` array | "Link type '{v}' is not allowed. Allowed: {list}." |
| TaskLink | target_task_id | Must differ from source | "A task cannot link to itself." |
| TaskLink | target_task_id | Must share the same `story_id` as source | "Linked tasks must belong to the same story." |
| TaskLink | (source, target, type) | Unique | "This link already exists." |
| Attachment | title | Required; 1–500 chars; free-form, not dictionary-validated <!-- updated: 2026-07-15 (STORY-021): replaces the removed `type` field --> | "A title is required for every attachment." |
| Attachment | kind | Required; one of the four enum values | "Attachment kind must be 'document', 'image', 'file', or 'external-ref'." |
| Attachment | content / file | Required when kind = document | "Content is required for document attachments." |
| Attachment | mime_type | Required when kind = document, image, or file; allowed values per kind | "MIME type '{v}' is not supported for {kind} attachments." |
| Attachment | external_url | Required when kind = external-ref; valid URI | "A valid URL is required for external reference attachments." |
| Comment | content | Required; 1–50,000 chars | "Comment content is required." |
| Comment | author_role | Required; non-empty; every caller (Web UI, REST, MCP); immutable after create <!-- updated: 2026-07-21 (STORY-008): was optional pre-STORY-008 --> | "Comment author is required." |
| Comment | in_reply_to | Optional, request-only; if supplied, the referenced comment must exist (404) and share the same container as the comment being created (422) <!-- new: 2026-07-21 (STORY-008) --> | "A reply must be on the same story, task, or milestone as the comment it replies to." |
| SystemSettings / ProjectSettings | values (default_web_ui_role) | Required; non-empty string; must be a member of the effective `participant_roles` for the scope <!-- new: 2026-07-21 (STORY-008) --> | "Value '{v}' is not allowed. Allowed: {list}." |
| Session | project_id | Required; must reference an existing project | "Project not found." (404) |
| Session | topic | Required; 1–500 chars; updatable, cannot be cleared | "Session topic is required." |
| Session | goal | Required; 1–500 chars; updatable, cannot be cleared <!-- new: 2026-07-30 (STORY-009 reconcile) --> | "Session goal is required." |
| Session | participant_role | Required; in `participant_roles` dict; updatable, cannot be cleared <!-- updated: 2026-07-30 (STORY-009 reconcile): was assumed free-form; ships dictionary-validated --> | "Value '{v}' is not allowed. Allowed: {list}." |
| Session | status | Required; one of `pending` / `in-progress` / `finished`; NOT dictionary-validated; not a creation input (always forced to `pending`); updatable, cannot be cleared <!-- updated: 2026-07-30 (STORY-009 reconcile): was assumed free-form; ships as a fixed enum --> | "Value '{v}' is not allowed. Allowed: pending, in-progress, finished." |
| SystemSettings / ProjectSettings | values (non-link_types keys) | Array; min 1 non-empty string | "Dictionary values cannot be empty." |
| SystemSettings / ProjectSettings | values (link_types key) | Array of `LinkTypeEntry` objects; min 1 entry; plain strings rejected | "link_types entries must be objects with 'value', 'outbound', and 'inbound' fields" (422) |
| SystemSettings / ProjectSettings | values (link_types, per entry) | Each of `value`, `outbound`, `inbound` required; 1–200 chars; non-empty | 422 (Pydantic field validation) |
| SystemSettings / ProjectSettings | values (link_types, uniqueness) | `value` fields within the array must be unique | "link_types values must be unique" (400 — domain ValidationError) |
| Milestone | name | Required; 1–200 chars; unique within the milestone's project (case-insensitive) | "A milestone named '{name}' already exists in this project." |
| Milestone | project_id | Required; must be an existing project UUID | "Project not found." (404) |
| Story | milestone_id | Optional; if set, milestone must exist (404) and belong to the story's project (422) | "This milestone does not belong to the story's project." |

### Business-Level

1. A task's project is determined transitively via `task.story_id → story.project_id`. All dictionary lookups use that project's effective settings.
2. Deleting a Project cascades to Stories → Tasks → Attachments → Comments → TaskLinks → ProjectSettings, and to Milestones → their Attachments and Comments, and to that project's own Sessions (all deleted). Sessions linked to a Story or Task that is deleted (within a project that itself survives) have just that link (`linked_story_id` or `linked_task_id`) set to null — the two links are cleared independently of one another. <!-- updated: 2026-07-30 (STORY-009 reconcile): a project's sessions are themselves cascade-deleted with the project, not merely link-cleared -->
3. `GET /stories/:id/aggregate` is always computed on demand; never stored.
4. `GET /tasks/:id/dependencies` returns raw data only — the utility never enforces blocking.
5. A session's `status` is a fixed three-value lifecycle enum (`pending`, `in-progress`, `finished`); it defaults to `pending` at creation (not accepted as a creation input — a `status` supplied at create is accepted-and-ignored) and is settable to any of the three values via update, in any direction, at any time — no transition order is enforced. A session is **incomplete** when `status` is `pending` or `in-progress`, and **complete** when `finished` — `status` is always set explicitly, never inferred from `result_decisions`/`result_summary` being null or non-null in any combination. <!-- updated: 2026-07-30 (STORY-009 reconcile): supersedes the original "both result fields null = incomplete" rule and the interim `is_complete` boolean that briefly replaced it during implementation -->
6. ProjectSettings for a given key completely replace (not merge with) the system default.
7. A session without a linked story or task is valid.
8. TaskLinks can only be created between tasks that share the same `story_id`. Both `source_task_id` and `target_task_id` must belong to the same parent story; cross-story task links are rejected (422).
9. A project can have at most one milestone with status `active` at a time. Activating a milestone when another is already `active` demotes the previous one to `planned` in the same database transaction.
10. Deleting a milestone sets `milestone_id` to null on all assigned stories; the stories themselves are not deleted. Deleting a project cascades to all its milestones.
11. `link_types` is the only dictionary key with a structured entry format (`LinkTypeEntry[]`). All other four dictionary keys (`task_statuses`, `task_types`, `story_statuses`, `participant_roles`) remain plain `string[]`. Sending a plain string in `link_types` is rejected with 422. Duplicate `value` fields within the same `link_types` array are rejected with 400. <!-- updated: 2026-07-15 (STORY-021): `attachment_types` removed from this list — the dictionary was retired -->
12. `link_type` validation on TaskLink and StoryLink creation checks against the `value` fields extracted from the effective `link_types` entries. The stored `link_type` column on `task_link` and `story_link` tables continues to hold the plain value string; existing rows are not back-filled when entries are updated.
13. A `link_types` entry where `outbound` and `inbound` are the same string (symmetric relationship) is valid and stored as-is.
14. Attachments are immutable once created: each has exactly one stored file (document, image, or file kind), written once at create and never overwritten. There is no update endpoint and no version history; to change content or an external-ref's `external_status`, delete the attachment and create a new one. <!-- updated: 2026-07-14 (STORY-007 spec, api-contract v1.5) -->
15. There is no archive lifecycle for attachments — the lifecycle is create + delete only. `DELETE /attachments/:id` works for every kind and is permanent, removing the DB row and, for document/image/file, the stored file. <!-- updated: 2026-07-14 (STORY-007 spec, api-contract v1.5) -->
16. Attachments may be attached to a story, task, or milestone (`container_type`). Deleting a story, task, or milestone permanently removes all of its attachments (DB rows and, for document/image/file, the stored files). <!-- updated: 2026-07-14 (STORY-007 spec, api-contract v1.5) -->
17. `author_role` on an Attachment is optional, free-form, accepted on every create path (all kinds), and immutable once set — descriptive metadata only, not access control. <!-- new: 2026-07-14 (STORY-007 spec, api-contract v1.5) -->
18. `title` on an Attachment is mandatory, free-form, and not dictionary-validated; it replaces the removed `type` field. For file-based create paths (multipart upload), an omitted `title` defaults to the uploaded file's name (truncated to 500 chars); every other create path (document-as-text JSON, external-ref JSON, and every MCP argument shape) requires it explicitly with no default. `title` is immutable once set — like every other attachment field, changing it means deleting the attachment and creating a new one. <!-- new: 2026-07-15 (STORY-021 reconcile) -->
19. The `attachment_types` dictionary key is removed from `SystemSettings` and `ProjectSettings`; sending it to a settings `PUT` is rejected as an unknown key with **422** (the same Pydantic `model_validator` path as any other unknown key — not 400). Existing attachments created before this change (which have a `type` but no `title`) are backfilled with a non-null `title` (derived from their former `type` value) so every attachment has one after this change ships. <!-- new: 2026-07-15 (STORY-021 reconcile); confirmed by migration tests against the real Alembic upgrade/downgrade -->
20. Comments attach to a story, task, **or milestone** (`container_type`); the `container_id` reference is FK-less (polymorphic, same convention as Attachment). Deleting a story, task, or milestone permanently removes all of its comments (application-level cascade — there is no DB FK to enforce it). <!-- new: 2026-07-21 (STORY-008 reconcile) -->
21. `author_role` on a Comment is required (non-empty) on every create call, for every caller — Web UI, REST, or MCP — with no exception. The server never substitutes a default for a missing/empty value; the request is rejected the same way regardless of caller. It is immutable once set: any attempt to change it via update is silently ignored, matching the same rule on `Attachment.author_role`. It is never validated against the `participant_roles` dictionary. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
22. A reply's lineage is a persisted, immutable **materialized ancestor path** (`ancestors`) — an ordered, root-first list of ancestor comment ids, computed once at create as `parent.ancestors + [parent.id]`; the direct parent is always `ancestors[-1]`. The create-time `in_reply_to` input (a comment id) is request-only: it is validated (referenced comment exists, shares the same container) and then reflected only through the derived `ancestors` — it is never itself stored or returned, though the derived relationship it produces is. `content` is always stored exactly as submitted, with no server-added text. This supersedes an earlier schema-free "prepend a link to `content`, store nothing" design considered for this feature; see ADR-023. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
23. Comment container lists and detail-composed `comments` arrays are ordered **newest-first** (descending `(created_at, id)`); pagination walks newest → oldest. The `after_id` watermark filter keeps its keyset meaning ("strictly newer than the referenced comment") regardless of display direction; it 404s if the referenced comment does not exist (including if it was since deleted) — a caller polling with a now-deleted watermark must re-list without it to recover. `descendant_of` returns the sub-thread beneath a given comment (every comment whose `ancestors` contains it) and combines freely with the other filters. Ancestor-lineage traversal (`GET /comments/:id/ancestors`) always stays root-first — a lineage path, not a chronological list — and is unaffected by this ordering rule. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
24. A standalone permalink to a comment that has since been hard-deleted cannot resolve to a host work item, because comments have no archive/tombstone and `GET /comments/:id` for a deleted id returns a plain 404 with no surviving container information. This is a graceful, non-error condition — see the Web UI requirements for the resulting fallback UI. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
25. `default_web_ui_role` is a single-value (scalar) setting resolved with the same system-default + project-override precedence as the five dictionaries. On write it must be non-empty and a member of the effective `participant_roles` for that scope; it is never re-validated on read and never constrains a comment's own free-form `author_role`. Its only product effect is pre-filling the Web UI's Add Comment form. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
26. The `participant_roles` dictionary's system-seeded defaults gain a new entry, `"operator"`, representing the human orchestrator (distinct from the pre-existing `"orchestrator"` agent-coordination role). As an ordinary dictionary entry it is thereafter selectable anywhere `participant_roles` is used — not restricted to the default Web UI role. <!-- new: 2026-07-21 (STORY-008 reconcile) -->
27. Every session belongs to exactly one project (`project_id`, required, immutable) — there is no project-less session and no cross-project session listing or incomplete-sessions query; every session read is scoped to a chosen `project_id`. Deleting a project cascades to delete all of its sessions. <!-- new: 2026-07-30 (STORY-009 reconcile) -->
28. A session's `participant_role` is required and validated against the project's effective `participant_roles` dictionary (422 otherwise, the same message convention as `default_web_ui_role` and task `assignee_role`/`creator_role`); it is updatable but cannot be cleared (explicit `null` → 422). <!-- new: 2026-07-30 (STORY-009 reconcile) -->
29. `linked_story_id` and `linked_task_id` are two independent optional fields on a Session — either, both, or neither may be set; neither substitutes for the other or for the mandatory `project_id` scope. Each is validated independently when set (referenced story/task must exist — 404 — and belong to the same `project_id` as the session — 422) and each is nulled automatically (application-side, since the SQLite FK action is inert) when its target story/task is deleted, unaffected by the state of the other link. <!-- new: 2026-07-30 (STORY-009 reconcile) -->

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

## Known Gaps <!-- updated: 2026-07-13 (STORY-020 reconcile) -->

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

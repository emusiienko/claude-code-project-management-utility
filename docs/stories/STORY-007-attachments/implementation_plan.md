# Implementation Plan: STORY-007 — Work Item Attachments

## Context

Attachments are the artifact layer of the utility — plans, architecture docs, implementation
reports, screenshots, and external links attached to a **story, task, or milestone**. This is the
first domain that persists user content on the **filesystem** (not the DB). It closes several
long-standing forward specs:

- `StoryDetail.attachments` and `TaskDetail.attachments` are currently returned as empty arrays
  (staged "empty until STORY-007" in the contract and reconcile logs).
- `GET /milestones/:id/detail` is deferred in the architecture Known Divergences precisely because
  the attachments domain did not exist yet.
- The Story slide-over, Task Detail modal, and Milestone Detail view all render a static
  "Attachments" placeholder awaiting this story.

The Attachments API surface is specified in `docs/api-contract.md` (entity `Attachment` and the
Attachments endpoint block) and in the backend/web requirements (updated at STORY-007 spec to add the
milestone container and — 2026-07-14 — to **remove version history**: one stored file per attachment,
document updates replace that file in place). The architect updates the contract to match this
decision as part of this plan (see "Contract change" below); no other shape changes.

The domain follows the established app-based vertical-slice pattern (model → repository → service →
controller + MCP tools) and the cross-domain **Protocol injection** pattern already used by
task-links, story-links, and the story aggregate.

## Contract change

Four attachments changes were approved on 2026-07-14. Because `docs/api-contract.md` is
architect-owned, this plan carries the matching contract revision (v1.5):

1. **Version history removed** — drop the `AttachmentVersion` entity and the
   `GET /attachments/:id/history` and `GET /attachment-versions/:id/file` endpoints. Each attachment
   has exactly one stored file.
2. **Attachments are immutable — the `PUT /attachments/:id` update endpoint is removed for all kinds.**
   An in-place file "update" is really a delete + create; making that explicit keeps the model honest.
   To change a document's content or an external-ref's `external_status`, delete the old attachment and
   create a new one.
3. **New `file` kind** — opaque binary attachments (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP; explicit MIME
   allow-list), multipart upload, downloaded via `GET /attachments/:id/file`, 10 MB limit. A companion
   MCP tool `get_attachment_file` returns any stored file's bytes as base64 so agents can read content.
4. **Archive removed** — drop `POST /attachments/:id/archive`, the `archived_at` field, and the
   `include_archived` list filter. The lifecycle is **create + delete only**, and
   `DELETE /attachments/:id` works for **every** kind (removes the row and, for document/image/file,
   the stored file). Keeping archived artifacts would re-introduce, through the back door, the version
   history that change 1 removed.

No attachments code was ever built, so this is a clean pre-implementation revision, not an as-built
divergence. The requirements (spec-writer-owned) still describe the `PUT` endpoint, the archive
endpoint, only three kinds, and `author_role` on the `AttachmentVersion` — those need the matching
update from spec-writer: remove PUT + archive, add the `file` kind, and **move `author_role` onto the
`Attachment` entity** (resolved 2026-07-14). See the to-do list I report at session end.

## Technical Approach

### Data model

One table in the domain package:

- **attachment** — a single table with a `container_type` discriminator (`story` | `task` |
  `milestone`) and a `container_id`. This is a **polymorphic association**: because `container_id`
  can reference three different tables, it carries **no database foreign key**. Container existence is
  therefore validated in the service (not by the DB), and cascade removal is application-level.
  Columns per the contract/requirements: `type`, `kind` (`document` | `image` | `file` |
  `external-ref`), `mime_type` (conditional — required for document/image/file), `file_size_bytes`
  (conditional — required for document/image/file), an internal `file_path` that is **never
  serialized**, `external_url` (conditional), `external_status`, `author_role` (optional, free-form —
  who created the attachment; descriptive metadata like `Comment.author_role` / `Task.creator_role`,
  set at create, nullable, not access control), timestamps. There is no `archived_at` — attachments
  are not archived (see lifecycle below).

Index the attachment table on `(container_type, container_id, type)` (the `archived_at` component is
dropped along with archiving).

### File storage semantics

Document, image, and file content lives on the attachments volume via `core.storage`; the DB holds
metadata plus the internal `file_path`. The storage helper today offers `write` / `read` / `snapshot`
but no `delete`; permanent removal (container-cascade removal of stored files) requires adding a
delete capability to the storage layer. (The `snapshot` helper is no longer needed by this story; it
stays in place, unused by attachments.)

**One file per attachment; attachments are immutable.** The file is written once at create time and
never overwritten — there is no update operation. `GET /attachments/:id/file` always serves that
content. To change content, delete the attachment and create a new one. There is no version history.

**The `file` kind is an opaque binary** (PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP — explicit MIME
allow-list). It behaves exactly like `image` on the storage side: multipart-only upload, stored file,
`mime_type` + `file_size_bytes` recorded, downloaded via `GET /attachments/:id/file`, hard-deletable.
It differs from `document` in that there is no JSON-text creation path (binary content cannot travel as
a JSON string) and the UI offers download rather than inline render.

### Service business rules

The attachments service owns all logic (controller and MCP tools stay thin), including:

- **Create** in four kinds — document (UTF-8 text via JSON, or a file via REST multipart / MCP base64),
  image (binary via REST multipart / MCP base64), file (opaque binary via REST multipart / MCP base64),
  external-ref (URL + optional status via JSON). The service takes already-decoded bytes, so multipart
  and base64 converge on one create path.
- **Container existence**: resolve and validate the parent story / task / milestone exists, reading
  the owning-domain repositories through Protocols (mirroring the existing cross-domain read pattern).
- **Dictionary validation**: `type` must be in the container's **project's** effective
  `attachment_types` dictionary. The owning project is resolved from the container — directly for
  story (`story.project_id`) and milestone (`milestone.project_id`), transitively for task
  (`task → story → project`).
- **Upload guards Pydantic cannot express** (surface as 400): file size ≤ 10 MB (all stored-file
  kinds) checked **before any bytes are written**; MIME type allowed per kind — document:
  `text/markdown` | `text/plain`; image: PNG/JPEG/GIF/WEBP; file: `application/pdf`, the Office
  OpenXML types (docx/xlsx/pptx), `text/csv`, `text/plain`, `application/json`, `application/zip`;
  `external_url` is a valid URI.
- **No update.** Attachments are immutable after create; there is no update method on the service and
  no `PUT` route. Changing content or an external-ref's status is done by delete + create.
- **No archive.** There is no archive operation and no `archived_at` — the lifecycle is create +
  delete only.
- **Delete** (all kinds, permanent). Removes the DB row and, for document/image/file, the stored file
  from the volume; external-ref has no file, so only its row is removed.
- **List** per container with pagination and `type` / `kind` filters; **file download** for
  document/image/file (external-ref → 400).

### Two access surfaces

The REST **create** endpoint accepts **both** `application/json` and `multipart/form-data` (this is
the first multipart surface in the codebase — content-type negotiation on a single route). Because
there is no update, create is the only route that negotiates content type.

**MCP is a complete create surface — agents can create all four kinds and upload files:** external-ref
(URL) and document-as-text (UTF-8 `content`) via plain JSON args, and **any stored-file kind uploaded
via a base64 argument** (`content_base64` + `mime_type`): image, file (opaque binary), **and a
document uploaded as a file** rather than inline text (e.g. an agent uploading an existing `.md`/`.txt`
it already has on disk). The tool decodes the base64 server-side onto the **same** service path the
REST multipart route uses, so an agent has full upload parity with the Web UI. This is symmetric to the
read tool `get_attachment_file`, which returns a stored file's bytes as base64 (document / image /
file; external-ref → error) so agents can read content (a PDF, or re-read a document) without an HTTP
fetch. So: REST carries file uploads as multipart (browser-friendly), MCP carries them as base64
(agent-friendly), and both converge on one service, so behavior stays consistent across surfaces.
Base64 payloads can be large; the create and read tools each handle one file at a time and are subject
to the same per-kind MIME allow-list and 10 MB limit.

### Cross-domain integration (Protocol injection)

An `AttachmentReader` Protocol (declared in the attachments service module, satisfied structurally by
the attachment service via the DI container) is injected into the story, task, and milestone services
for two purposes, exactly mirroring the task-links / story-links precedent:

1. **Application-level cascade delete.** Because `container_id` has no FK, deleting a story, task, or
   milestone must explicitly remove that container's attachments — DB rows **and** the files on disk —
   before the container is removed. This extends the ADR-018 application-cascade precedent to a no-FK
   polymorphic case, and honors the business rule that a container delete permanently removes its
   attachments.
2. **Detail composition.** `GET /stories/:id/detail` and `GET /tasks/:id/detail` populate their
   `attachments` arrays instead of the current empty placeholder. `GET /milestones/:id/detail`
   is built for the first time, composing the milestone's attachments (its `comments` stay empty
   pending STORY-008) — closing that Known Divergence.

Container declaration order in the DI container matters: the attachment service consumes the story,
task, and milestone repositories and must be declared **before** the work-item services that receive
it as the reader Protocol. Repository declarations may need to be reordered accordingly.

### Frontend

The attachment UI is one behavior reused in three hosts (Story slide-over right panel, Task Detail
modal, Milestone Detail view). Build it once as a self-contained attachments feature — API endpoints,
TanStack Query hooks (list + create/delete mutations that invalidate the container's attachment list
and the parent detail), and shared components: an Attachments section (list with type/kind badges,
size, timestamp, per-row view/download/delete actions using Lucide `IconButton`s), an upload panel
(kind selector — document / image / file / external-ref; type dropdown from effective
`attachment_types`; document write-Markdown-or-upload-file toggle; image picker; **file picker for the
curated binary allow-list (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP)** with a client-side 10 MB guard;
external-ref URL + status), and a delete confirmation dialog (delete works for every kind).

**In-app viewer (modal), by `mime_type`.** The row "view" action opens an in-app viewer modal for the
types that render meaningfully; everything else is a plain download. All content comes from the REST
`GET /attachments/:id/file` URL (the base64 MCP tool is agent-only and is never used by the UI):

- **document `text/markdown`** → rendered formatted, reusing the app's existing Markdown renderer
  (same one used for story/task content).
- **document `text/plain`, `text/csv`, `application/json`** → shown as raw text in a scrollable
  `<pre>` block.
- **image** (PNG/JPEG/GIF/WEBP) → lightbox with `<img>`.
- **`application/pdf`** → embedded via `<iframe>` (the browser's native PDF viewer; no bundled PDF
  library).
- **`docx` / `xlsx` / `pptx` / `zip`** → no inline rendering; the row shows a **download** action only
  (in-app rendering would need heavy libraries or an external service — out of scope for a local tool).

`external-ref` rows have no file: their action opens the `external_url` in a new tab. Then mount that
section in the three host screens, replacing the placeholders and passing the container identity as
props.

## Ordered Tasks

1. **TASK-001** (backend-developer): Attachment data layer and migrations — ORM model (polymorphic
   FK-less `container_id`), repository (polymorphic per-container queries, filtered/paginated list,
   and the cascade-removal query set), migrations in the root-first inline-FK style, and a filesystem
   `delete` capability in `core.storage`.
2. **TASK-002** (backend-developer, depends on TASK-001): Attachment service, REST controller, MCP
   tools, and DI wiring — all business rules across the four kinds (document/image/file/external-ref),
   dual JSON/multipart create handling, per-kind MIME allow-lists, MCP create for all four kinds
   (binary via base64), the `get_attachment_file` MCP base64 read tool, and container/dictionary
   validation.
3. **TASK-003** (backend-developer, depends on TASK-002): Cross-domain integration — the
   `AttachmentReader` Protocol injected into story/task/milestone services for application-level
   cascade delete (rows + files) and for detail composition, including building
   `GET /milestones/:id/detail` with composed attachments.
4. **TASK-004** (frontend-developer, depends on TASK-002): Attachments feature module — API layer,
   hooks, and shared components (Attachments section, upload panel supporting all four kinds including
   the binary `file` picker, row with view/download action, delete dialog), self-contained
   and not yet mounted.
5. **TASK-005** (frontend-developer, depends on TASK-004): Mount the Attachments section in the Story
   slide-over right panel, the Task Detail modal, and the Milestone Detail view, replacing the
   placeholders.
6. **TASK-006** (qa-automation, depends on TASK-002 and TASK-003): Automated tests covering the
   attachments backend surface, business rules, and edge cases.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Polymorphic FK-less attachment container + application-level cascade of rows and files | If implemented as designed — record extending the ADR-018 app-cascade precedent to a no-FK polymorphic association |

## Constraints & Gotchas

- **`container_id` has NO foreign key** (it is polymorphic across three tables). Container existence
  must be validated in the service; deletion cascade cannot rely on the DB and is done
  application-side — the SQLite `PRAGMA foreign_keys` gap is irrelevant here because there is no FK to
  enforce in the first place.
- **File size is checked before any bytes are written.** A > 10 MB upload is rejected up front with
  "File must be smaller than 10 MB." — no partial file is ever persisted. The 10 MB limit applies to
  every stored-file kind (document, image, file).
- **Per-kind MIME allow-lists (400 on violation).** document: `text/markdown` | `text/plain`; image:
  PNG/JPEG/GIF/WEBP; file: `application/pdf`, Office OpenXML (docx/xlsx/pptx), `text/csv`,
  `text/plain`, `application/json`, `application/zip`. Anything outside the list for its kind is
  rejected — this is a security boundary, so no "any binary" fallthrough.
- **Binary over MCP is base64, both directions; the UI uses REST.** Agents create image/file via a
  base64 argument (`content_base64` + `mime_type`) and read any stored file via `get_attachment_file`
  → `{ mime_type, content_base64 }` (document/image/file; external-ref → error). The Web UI never uses
  the base64 tools — it uploads via multipart and downloads via `GET /attachments/:id/file` (a plain
  anchor; browser opens or downloads per Content-Type). Both surfaces converge on one service path.
  Base64 can be large; the create and read tools each handle one file at a time and enforce the same
  per-kind MIME allow-list and 10 MB limit.
- **`file_path` is server-internal and must never appear in any API response** (REST or MCP), and file
  paths are never constructed from user input (files live in the server-managed attachments volume).
- **One file per attachment; attachments are immutable; no version history.** The file is written
  once at create and never overwritten. There is no update method, no `PUT` route, no history
  endpoint, and no version-file endpoint. `GET /attachments/:id/file` always serves the create-time
  content. Changing content = delete + create.
- **Create + delete only; no archive.** There is no `archived_at`, no `POST .../archive`, and no
  `include_archived` filter. `DELETE /attachments/:id` works for **every** kind and is permanent:
  it removes the DB row and, for document/image/file, the stored file. external-ref has no file, so
  only its row is removed. Container-cascade delete removes all of a container's attachment rows and
  files the same way.
- **Two 4xx paths on create:** request-schema (Pydantic) failures — missing `content`/`file` for the
  kind, missing required fields — are **422**; upload business rules Pydantic cannot express (size,
  MIME, invalid URI) are **400**; `type` not in the `attachment_types` dictionary is **422**
  (`UnprocessableError`). Match the existing project convention (domain `ValidationError` → 400).
- **Dual content-type on create** (`POST` accepts JSON and multipart) is new to this codebase — the
  controller negotiates on `Content-Type`; the service takes already-decoded inputs so both paths
  converge on one code path. This is the only content-negotiating route (there is no update).
- **`author_role` is a stored column on `Attachment`** (resolved 2026-07-14). It previously lived on
  the now-removed `AttachmentVersion`; the decision is to add it to the `Attachment` entity itself. It
  is optional and free-form (who created the attachment), accepted on **every** create path (JSON and
  multipart, all kinds), set once at create, and immutable thereafter (like the rest of the
  attachment). It is descriptive metadata only — never access control. The requirements
  (spec-writer-owned) must be updated to move `author_role` onto the `Attachment` entity.
- **DI declaration order:** the attachment service consumes the story/task/milestone repositories and
  must be declared before the work-item services that receive the `AttachmentReader` Protocol;
  reorder repository providers as needed (see the STORY-005 declaration-order note for precedent).
- **`external_url` external-ref has no stored file.** External-ref delete is DB-row-only; it does not
  touch the filesystem. The storage `delete` capability exists solely for container-cascade removal of
  document/image files.
- **The utility stores facts, never enforces process:** `external_status` is a free-form label the
  utility stores without interpretation; there is no workflow around attachments.
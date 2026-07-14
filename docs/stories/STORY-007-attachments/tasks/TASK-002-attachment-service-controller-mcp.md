---
status: ToDo
assignee: backend-developer
story: STORY-007
---

# TASK-002: Attachment service, REST controller, and MCP tools

## What to implement

The attachments business layer and its two thin access surfaces (REST + MCP), wired into the DI
container. All logic lives in the service; the controller and MCP tools only adapt inputs/outputs.

**Service — create (four kinds):**
- **document** — from UTF-8 text (JSON path, agent-friendly) or an uploaded file (REST multipart / MCP
  base64).
- **image** — from an uploaded binary (REST multipart / MCP base64).
- **file** — an opaque binary (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP) from an uploaded file (REST
  multipart / MCP base64); no JSON-text path.
- **external-ref** — URL plus optional free-form status (JSON path); no file is stored.
- For document/image/file, write the content to the attachments volume and persist metadata plus the
  server-internal file path.
- **`author_role`** (optional, free-form) is captured on every create path and stored on the
  attachment. It is descriptive metadata only, set once at create.

**Service — validation, in the project's precedence convention:**
- Container existence: the parent story, task, or milestone must exist (404 otherwise). Read the owning
  domain's data through Protocols declared in the attachments service module (mirroring the existing
  cross-domain read pattern) rather than importing concrete services.
- Dictionary: `type` must be in the container's project's effective `attachment_types`. Resolve the
  owning project from the container — directly for story and milestone, transitively
  (`task → story → project`) for task.
- Upload guards enforced before any bytes are written: file size ≤ 10 MB ("File must be smaller than
  10 MB.", all stored-file kinds); MIME type allowed per kind — document: `text/markdown` |
  `text/plain`; image: PNG/JPEG/GIF/WEBP; file: `application/pdf`, Office OpenXML (docx/xlsx/pptx),
  `text/csv`, `text/plain`, `application/json`, `application/zip`; `external_url` a valid URI. These
  surface as 400. The `file` MIME allow-list is a security boundary — no "any binary" fallthrough.
- Request-schema failures (missing `content`/`file` for the kind, missing required fields) surface as
  422; `type` not in the dictionary surfaces as 422.

**Service — delete (no update, no archive):**
- Attachments are immutable after create — there is no update method and no `PUT` route for any kind.
- There is no archive operation and no `archived_at` — the lifecycle is create + delete only.
- Hard-delete every kind (permanent). Removes the DB row and, for document/image/file, the stored file
  from the volume; external-ref has no file, so only its row is removed.

**Service — reads:**
- Per-container paginated list with `type` and `kind` filters.
- Single metadata fetch.
- File download bytes plus the `mime_type` to serve as Content-Type for document/image/file;
  external-ref → 400 ("External reference attachments do not have a stored file.").
- Stored-file bytes as base64 for the MCP read tool (document/image/file; external-ref → 400).

**REST controller:**
- All endpoints from the ratified Attachments contract block, under the three container prefixes
  (`/stories/:id/attachments`, `/tasks/:id/attachments`, `/milestones/:id/attachments`) and the
  top-level attachment routes. **Create** accepts **both** `application/json` and
  `multipart/form-data`, negotiated on the request Content-Type; both converge on the single service
  path. Create is the only content-negotiating route (there is no update). File downloads stream raw
  bytes with Content-Type set from `mime_type`.

**MCP tools:**
- Mirror the full agent-facing surface: create document-as-text and external-ref via plain args, plus
  **create any stored-file kind (image, file, document-as-file) via a base64 arg** (`content_base64` +
  `mime_type`, decoded onto the same service path as the multipart route — full upload parity with the
  Web UI); plus delete, list, and get. Add `get_attachment_file(id)` returning
  `{ mime_type, content_base64 }` for document/image/file (external-ref → error) so agents can read
  content. The create and read base64 tools handle one file at a time under the same MIME allow-list and
  10 MB limit. Tools return values (never void) and map domain errors consistently.

**DI wiring:**
- Register the attachment repository and service. The service consumes the filesystem storage
  singleton, the settings service (effective dictionary), and the story/task/milestone repositories.
  Declare it before the work-item services that will receive it in TASK-003; reorder repository
  providers if the declaration order requires it.

## Scope
`backend/app/attachments/` (service, schema, controller, MCP tools), `backend/app/api/` (router
registration), `backend/app/mcp/` (tool registration), `backend/app/container/`.

## Dependencies
TASK-001.

## Acceptance Criteria
- [ ] A document attachment can be created on a story, task, or milestone via JSON text content or via a multipart file upload; the content is written to the filesystem.
- [ ] An image attachment can be uploaded to a story, task, or milestone via multipart; the file is written to the filesystem.
- [ ] A `file` attachment (binary in the curated MIME allow-list, e.g. a PDF) can be uploaded via multipart; the file is written to the filesystem.
- [ ] Agents can create any stored-file kind (image, file, document-as-file) over MCP via a base64 argument, with the same result as the REST multipart upload.
- [ ] An external-reference attachment can be created with a required URL and optional status; no file is stored.
- [ ] `author_role` is optional on every create path and is stored on the attachment; it appears in responses and is not required.
- [ ] There is no update (PUT) route and no archive route for any kind; changing content is done by delete + create.
- [ ] The stored file for a document, image, or file can be downloaded with the correct Content-Type; requesting the file of an external-ref returns 400 with the specified message.
- [ ] The MCP `get_attachment_file` tool returns `{ mime_type, content_base64 }` for document/image/file and errors for external-ref.
- [ ] Any kind can be hard-deleted (204); delete removes the DB row and, for document/image/file, the stored file from the volume.
- [ ] Attachments can be listed per container with pagination and `type` / `kind` filtering.
- [ ] A > 10 MB upload is rejected before any bytes are written; a MIME type outside the kind's allow-list is rejected (400); a `type` not in `attachment_types` is rejected (422).
- [ ] `file_path` never appears in any REST or MCP response.
- [ ] REST and MCP produce behavior-identical results for the operations both expose.

## Intended ADR
None created here. See implementation_plan.md "Planned ADRs" (recorded at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
</content>

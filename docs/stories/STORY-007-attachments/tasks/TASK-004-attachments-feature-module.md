---
status: ToDo
assignee: frontend-developer
story: STORY-007
---

# TASK-004: Attachments feature module (API, hooks, components)

## What to implement

A self-contained attachments feature that will be reused in three host screens (TASK-005). Build the
data layer and shared components; do not mount them yet.

**API layer:**
- Endpoint functions for the full attachments surface: list per container (story/task/milestone) with
  pagination and `type` / `kind` filters; create (JSON for document text and external-ref; multipart
  for document file, image, and `file` binary upload); get metadata; delete; and the file URL for
  downloading / opening in a new tab. There is no update endpoint and no archive endpoint. The base64
  MCP read tool is agent-only and is not part of the frontend surface. Add any missing contract types
  (`Attachment`, the four-value kind union, container-type union) to the API types module.

**Hooks (TanStack Query):**
- A container-scoped attachment list query, and mutations for create and delete (no update, no archive).
  Mutations invalidate the container's attachment list and the parent detail cache so the section and
  any composed detail stay in sync.

**Components:**
- **Attachments section** — a reusable section parameterized by container type and id: renders the
  container's attachments (type badge, kind badge, name/URL, file size, created timestamp, author role),
  an "Add attachment" entry point, and per-row actions via Lucide `IconButton`s: view (opens the in-app
  viewer for renderable types), download (all stored-file kinds), delete (every kind). external-ref
  rows open the `external_url` in a new tab. Destructive actions use the danger tone; every icon-only
  button has a matching tooltip and `aria-label`.
- **In-app viewer (modal)** — opened by the row "view" action, rendering the file (fetched from the
  REST `GET /attachments/:id/file` URL; the base64 MCP tool is never used by the UI) by `mime_type`:
  - `text/markdown` (document) → rendered formatted, reusing the app's existing Markdown renderer.
  - `text/plain` / `text/csv` / `application/json` → raw text in a scrollable `<pre>`.
  - image (PNG/JPEG/GIF/WEBP) → lightbox `<img>`.
  - `application/pdf` → embedded `<iframe>` (browser-native PDF viewer; no bundled PDF library).
  - `docx` / `xlsx` / `pptx` / `zip` → not viewable inline; the row offers download only (no viewer).
- **Upload panel** — kind selector (document / image / file / external-ref); type dropdown populated
  from the project's effective `attachment_types`; for document, a mode toggle between writing Markdown
  in a textarea and uploading a `.md`/`.txt` file (MIME auto-detected); for image, a file picker for
  PNG/JPEG/GIF/WEBP; for `file`, a file picker for the curated binary allow-list
  (PDF/DOCX/XLSX/PPTX/CSV/TXT/JSON/ZIP); both binary pickers apply a client-side 10 MB guard that shows
  "File must be smaller than 10 MB." before upload; for external-ref, a required URL input and optional
  status input; an optional author-role input; and a submit action. Show an upload progress indicator
  for files larger than 1 MB.
- **Delete** confirmation dialog (delete applies to every kind).

**Behavior & errors:**
- Follow the shared error-handling conventions: field-level errors mapped to inputs, 400/422 messages
  surfaced inline near the relevant control, 404/500/network handled per the app-wide policy. All
  interactive elements are keyboard-accessible with visible focus.

## Scope
`frontend/src/features/attachments/`, `frontend/src/api/` (endpoints + types). No changes to host
screens in this task.

## Dependencies
TASK-002 (backend endpoints available for runtime verification; the module can be built against the
contract).

## Acceptance Criteria
- [ ] Endpoint functions and hooks cover list, create (all four kinds, JSON and multipart), get, and delete (no update, no archive).
- [ ] The Attachments section renders the container's attachments with type/kind badges, size, and timestamp.
- [ ] The upload panel supports all four kinds, auto-detects document MIME, offers the curated `file` binary picker, guards binary size client-side at 10 MB, and shows progress for files > 1 MB.
- [ ] The in-app viewer renders markdown formatted, text/csv/json as raw text, images in a lightbox, and PDF in an embedded iframe; docx/xlsx/pptx/zip offer download only; external-ref opens its URL in a new tab.
- [ ] Delete uses a confirmation dialog and works for every kind; the correct action set is shown per kind.
- [ ] All action buttons use Lucide icons with tooltips and `aria-label`; destructive actions use the danger tone; the module is keyboard-accessible.

## Intended ADR
None.

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

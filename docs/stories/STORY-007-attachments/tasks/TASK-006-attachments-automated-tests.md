---
status: ToDo
assignee: qa-automation
story: STORY-007
---

# TASK-006: Write automated tests for the attachments backend

## What to implement
Write automated tests covering the following:

**Endpoints / operations (per container: story, task, milestone):**
- POST create document via JSON text — happy path; content written and downloadable
- POST create document via multipart file — happy path
- POST create image via multipart — happy path; MIME outside the image allow-list rejected (400)
- POST create file (binary) via multipart — happy path (e.g. a PDF); MIME outside the curated file allow-list rejected (400); no "any binary" fallthrough
- MCP create via base64 — image, file, and document-as-file created over MCP produce the same stored result as the equivalent REST multipart upload
- POST create external-ref via JSON — happy path; invalid URL rejected (400); no file stored
- POST create — `author_role` optional on every create path; when provided it is stored and returned; when omitted the attachment is still created
- POST create — container not found (404); `type` not in `attachment_types` (422); missing required fields for the kind (422)
- POST create — file > 10 MB rejected (400) with no file written (applies to document/image/file)
- GET list — pagination, `type` filter, `kind` filter
- GET /attachments/:id — metadata found / not found (404); `file_path` absent from the response
- GET /attachments/:id/file — document, image, and file return bytes with Content-Type = `mime_type`; external-ref returns 400 with the specified message; not found (404)
- MCP get_attachment_file — returns `{ mime_type, content_base64 }` for document/image/file; external-ref errors; not found errors
- No update route and no archive route — there is no `PUT /attachments/:id` and no `POST /attachments/:id/archive`; confirm both are absent for every kind
- DELETE /attachments/:id — every kind hard-deleted (204); document/image/file also remove the stored file; not found (404)

**Behaviors:**
- Immutability — an attachment's stored file is written once at create and never changes; there is no update operation
- Per-kind MIME allow-list — each kind accepts only its listed MIME types; a type valid for one kind is rejected for another
- Dictionary resolution — `type` is validated against the container's project's effective `attachment_types`, resolved directly for story/milestone and transitively (task → story → project) for task
- Delete removes the DB row and, for document/image/file, the stored file from the volume
- REST and MCP produce equivalent results for the operations both expose (create of every kind incl. binary via base64, delete, list, get, get_attachment_file)

**Edge cases:**
- Deleting a story, task, or milestone permanently removes all its attachments and their files (application-level cascade — no orphan rows or files remain on either dialect)
- Story detail and task detail return their attachments; `GET /milestones/:id/detail` composes attachments with an empty comments array
- File size boundary at exactly 10 MB vs just over

## Scope
Backend attachments domain — REST endpoints, MCP tools, service business rules, and cross-domain cascade/detail integration (TASK-002 and TASK-003).

## Dependencies
TASK-002, TASK-003 (implementation must be complete before tests can run green).

## Acceptance Criteria
- [ ] All listed endpoints and behaviors have at least one test
- [ ] Cascade-delete, immutability (no update route, no archive route), delete-of-every-kind (row + file), and dictionary-validation edge cases are covered
- [ ] Tests confirm `file_path` never appears in any response
- [ ] Tests pass against the running application

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

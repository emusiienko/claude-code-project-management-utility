---
session: SESSION-014
agent: architect
status: completed
---

## Briefing
**Goal**: Discuss and clarify `docs/stories/STORY-007-attachments/implementation_plan.md` with the user before implementation starts.

**Context**: The architect just completed Feature Design for STORY-007 (Work Item Attachments) autonomously, producing `docs/stories/STORY-007-attachments/implementation_plan.md` and 6 task files (TASK-001 through TASK-006) in `docs/stories/STORY-007-attachments/tasks/`. The user reviewed the plan and wants to talk it through directly with the architect before greenlighting implementation.

**Topics**: Open — the user will raise their questions/concerns about the plan at the start of the session.

---

## Report
*(filled by the callee agent — architect)*

**Status**: completed 2026-07-14.

**Decisions made** (all pre-implementation; STORY-007 has no code yet, so these are clean contract
revisions, not as-built divergences — captured as api-contract **v1.5**):

1. **Version history removed** — no `AttachmentVersion` entity, no `/history` or
   `/attachment-versions/:id/file` endpoints. One stored file per attachment.
2. **Attachments are immutable** — `PUT /attachments/:id` removed for all kinds. Change content =
   delete + create.
3. **Archive removed** — no `POST /attachments/:id/archive`, no `archived_at`, no `include_archived`.
   Lifecycle is create + delete only; `DELETE /attachments/:id` works for **every** kind (removes the
   row and, for stored-file kinds, the file). Rationale: keeping archived docs would smuggle back the
   version history removed in (1).
4. **New `file` kind** — opaque binary (curated MIME allow-list: pdf, docx, xlsx, pptx, csv, txt,
   json, zip), multipart upload, 10 MB limit (same limit for all stored-file kinds).
5. **Agents get a full binary create/read surface over MCP via base64** — `get_attachment_file`
   reads any stored file as `{ mime_type, content_base64 }`; base64 create tools upload image / file /
   document-as-file (parity with the Web-UI multipart route; one file per call).
6. **Frontend in-app viewer** — markdown rendered, text/csv/json as `<pre>`, images lightbox, PDF via
   `<iframe>`; docx/xlsx/pptx/zip download only; external-ref opens its URL. All content via the REST
   file URL (base64 tools are agent-only).
7. **`author_role` moves onto the `Attachment` entity** — optional, free-form, accepted on every
   create path, stored, immutable. (It previously lived on the removed `AttachmentVersion`.)

**Files updated by the architect this session**: `implementation_plan.md` + all six task files;
`docs/api-contract.md` (v1.5 revision); `docs/architecture.md`; `CLAUDE.md`.

**Open questions**: none outstanding for the architect.

**To-do for spec-writer** (requirements are behind the v1.5 contract):
- Remove the `PUT /attachments/:id` endpoint and the `POST /attachments/:id/archive` endpoint from
  `requirements_backend.md`; remove the update/archive acceptance criteria from `description.md`.
- Remove `archived_at`, `include_archived`, and the `(…, archived_at)` index from the Attachment
  entity/spec; drop the `AttachmentVersion` entity entirely.
- Add the `file` kind (MIME allow-list, 10 MB), the MCP base64 create/read tools, and the in-app
  viewer behavior to the web requirements.
- **Move `author_role` from `AttachmentVersion` onto the `Attachment` entity.**

**Summary**: The attachments domain was substantially simplified and then extended during the review:
stripped of version history, update, and archive (down to create + delete on immutable attachments),
then broadened with a generic binary `file` kind, full agent parity for binary upload/read over MCP
(base64), an in-app viewer for renderable types, and `author_role` promoted to a first-class
attachment field. Architect docs are internally consistent; the spec-writer to-do list above is the
only follow-up before implementation.

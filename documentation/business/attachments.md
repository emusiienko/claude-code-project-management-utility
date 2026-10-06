# Attachments

## Happy Path

1. From a story's, task's, or milestone's **Attachments** section, the orchestrator (or an agent)
   clicks **Add attachment**, picks a kind — document, image, file, or external reference — and
   provides content plus a title.
2. For a file-based kind, the title defaults to the uploaded file's name (still editable before
   submitting); for a document written as text, or an external reference, a title must be typed in
   explicitly.
3. The new attachment appears in the (paginated) list, showing its title, kind badge, file size, and
   created date.
4. Clicking **View** opens it in-place: a Markdown document renders formatted; a plain-text/CSV/JSON
   document shows as raw text; an image opens in a lightbox; a PDF opens in an embedded viewer;
   DOCX/XLSX/PPTX/ZIP offer a download link instead of an inline preview; an external reference opens
   its URL in a new tab.

## Other Scenarios

- **Filter the list** by kind.
- **Delete an attachment**: permanent, for every kind, after a confirmation — there is no archive
  step and no edit; changing content or title means deleting and re-creating.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access.

## Business Rules

- Every attachment requires a title (free-form, not restricted to a fixed set of values).
- Attachments are immutable: exactly one stored file per attachment (for document/image/file kinds),
  written once and never overwritten.
- `author_role` is optional, free-form, and — once set — never changes.
- Deleting a story, task, milestone, or project permanently removes every attachment on it. Its stored
  files are cleaned up right after, except files less than one hour old, which stay on disk until a
  later delete's cleanup or a service restart removes them; the attachment itself is gone at once.
  Deleting a single attachment removes its own file immediately.
- A stored file (document/image/file) may not exceed 10 MB.

## Known Limitations

None currently known.

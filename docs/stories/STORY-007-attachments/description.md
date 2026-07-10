---
status: Planned
type: feature
priority: P1
date: 2026-06-28
---

# STORY-007: Work Item Attachments

## Desired Outcome
Documents, images, and external references can be attached to stories, tasks, or milestones. Document and image files are stored on disk and directly downloadable. Documents maintain a full version history — each content update creates a new snapshot while the previous versions remain accessible. External references store a URL and an optional status string; they have no file.

## Context
Attachments are the artifact layer of the utility. Plans, architecture docs, implementation reports, screenshots, and external links all live here. Storing files on disk means agent-written documents (like implementation reports) are accessible as plain files — not only through the API. Archiving (rather than deleting) documents and images ensures history is never lost. The attachment type comes from the project's effective `attachment_types` dictionary.

## Acceptance Criteria
- [ ] A document attachment (Markdown or plain text, max 10 MB) can be created on a story, task, or milestone by submitting text content directly (agent-friendly) or uploading a file; the content is written to the server filesystem
- [ ] An image attachment (PNG, JPEG, GIF, or WEBP, max 10 MB) can be uploaded to a story, task, or milestone; the file is written to the server filesystem
- [ ] An external-reference attachment can be created with a required URL and an optional `external_status` string
- [ ] The stored file for any document or image attachment can be downloaded
- [ ] A document attachment's content can be updated; each update creates a new version snapshot preserving the previous content
- [ ] The full version history of a document attachment can be retrieved; any individual historical version's content can be downloaded
- [ ] A document or image attachment can be archived; archived attachments are excluded from default listings but retrievable with an explicit flag
- [ ] An external-reference attachment can be deleted permanently
- [ ] Attachments on a story, task, or milestone can be listed with pagination, with optional filtering by kind (document / image / external-ref)

## Edge Cases & Error Scenarios
- [ ] Uploading a file exceeding 10 MB is rejected before any data is written: "File must be smaller than 10 MB."
- [ ] Uploading an image with an unsupported MIME type (not PNG, JPEG, GIF, or WEBP) is rejected
- [ ] Attempting to update an archived document attachment is rejected
- [ ] Requesting the file download for an external-reference attachment returns an error: "External reference attachments do not have a stored file."
- [ ] Using an attachment type not in the project's `attachment_types` dictionary is rejected with a validation error
- [ ] When a story is deleted, all its attachments are permanently removed
- [ ] When a milestone is deleted, all its attachments are permanently removed

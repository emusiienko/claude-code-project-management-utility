---
status: ToDo
assignee: backend-developer
story: STORY-008
---

# TASK-004: Detail composition and cascade delete

## What to implement
Wire comments into the story, task, and milestone detail views and delete cascades, using the
`CommentReader` Protocol from TASK-002 — mirroring how `AttachmentReader` is already injected into
those three services.

- Inject a `CommentReader` dependency into the story, task, and milestone services (alongside the
  existing attachment reader), imported Protocol-only.
- Each `get_detail` populates its `comments` list with the container's comments ordered oldest-first
  — closing the previously-empty `comments` field on all three detail views.
- Each `delete` cascades comment removal for its container (the reader's cascade path), consistent
  with the existing attachment cascade on delete.

## Scope
Story, task, and milestone services (detail composition + delete cascade). No new endpoints; the
existing detail and delete endpoints gain populated/cascaded comments.

## Dependencies
TASK-002.

## Acceptance Criteria
- [ ] Story, task, and milestone detail responses return their comments oldest-first (empty list
  when none), replacing the previously-always-empty `comments` field.
- [ ] Deleting a story, task, or milestone removes all its comments — no orphaned comment rows
  remain.
- [ ] The three services depend only on the `CommentReader` Protocol, not on the comment controller
  or concrete service type beyond the Protocol.

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

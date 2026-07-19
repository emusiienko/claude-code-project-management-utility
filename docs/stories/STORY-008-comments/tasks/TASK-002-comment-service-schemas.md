---
status: ToDo
assignee: backend-developer
story: STORY-008
---

# TASK-002: Comment service and schemas

## What to implement
Implement the comment business logic and request/response schemas in the `comments` domain service.

- **Create** across all three containers with this validation precedence:
  1. container exists (404 otherwise) — resolved via cross-domain reader Protocols
     (story / task / milestone), satisfied structurally by the concrete repositories;
  2. `content` non-empty and within 1–50,000 chars (422 otherwise);
  3. `author_role` non-empty (422 otherwise);
  4. when `in_reply_to` is supplied: the referenced comment exists (404 otherwise) and shares the
     same container as the comment being created (422 otherwise).
  On a valid reply, compute and persist `ancestors` as `parent.ancestors + [parent.id]`. Store
  `content` exactly as submitted — no server-side prefixing.
- **Update** changes `content` and/or `labels` independently: updating only content leaves labels
  unchanged and vice versa; an empty labels array clears all labels. Any `author_role` or
  `ancestors` supplied on update is silently ignored (both immutable).
- **Get-by-id**, **list**, and **delete**.
- **Ancestor traversal**: a `get_ancestors` method returning the ordered (root-first) ancestor
  comment bodies for a comment, resolving its `ancestors` ids through the repository `list_by_ids`
  in a single query.
- Declare the cross-domain container reader Protocols here, and a `CommentReader` Protocol (the
  reverse direction) for use by the story / task / milestone services in TASK-004.
- Schemas: `CreateComment` (content, author_role, labels?, in_reply_to?), `UpdateComment`
  (content?, labels?), and the `Comment` response exposing `id`, `container_type`, `container_id`,
  `content`, `author_role`, `labels`, `ancestors`, `created_at`, `updated_at`. Field-level
  validation (lengths / non-empty) lives on the input schemas per the layering convention; existence
  and cross-field rules live in the service.

## Scope
`comments` domain service and schemas. Consumes the TASK-001 repository.

## Dependencies
TASK-001.

## Acceptance Criteria
- [ ] Creating a comment on a story, task, or milestone with valid content and author_role succeeds
  and returns the `Comment` shape including `ancestors` (empty for a non-reply).
- [ ] The create validation precedence holds exactly (container 404 → content 422 → author_role 422
  → in_reply_to 404 → same-container 422), with the story's specified error messages.
- [ ] A reply persists `ancestors = parent.ancestors + [parent.id]`; `content` is stored verbatim.
- [ ] Update changes content and labels independently; an empty labels array clears labels;
  attempts to change `author_role` or `ancestors` have no effect.
- [ ] `get_ancestors` returns ancestor bodies root-first; an empty list for a top-level comment.
- [ ] The `CommentReader` and container reader Protocols are defined for cross-domain use.

## Intended ADR
None (Planned ADRs recorded in the implementation plan; created at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

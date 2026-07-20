---
status: Done
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
**Date**: 2026-07-20

**What was done**: Built the `comments` domain service and schemas on top of TASK-001's model/
repository, structurally mirroring `attachments`:
- `app/comments/schema.py` — `Label` (own copy, matching the per-domain-duplication precedent
  used by `tasks`/`stories`); `CreateComment` (`content`, `author_role`, `labels?`,
  `in_reply_to?`) with field-level validators for content non-empty/≤50,000 chars and
  author_role non-empty; `UpdateComment` (`content?`, `labels?` only — `author_role`/`ancestors`
  are not fields on this schema at all, so there is nothing for a caller to even attempt to
  change); response `Comment` (`id`, `container_type`, `container_id`, `content`, `author_role`,
  `labels`, `ancestors`, `created_at`, `updated_at`); `PaginationMeta`. Container-type constants
  (`CONTAINER_STORY`/`CONTAINER_TASK`/`CONTAINER_MILESTONE`/`ALL_CONTAINER_TYPES`) are defined
  locally rather than imported from `app.attachments.schema`, keeping the comments package
  independent of the attachments domain despite the shared literal values.
- `app/comments/service.py` — `CommentService`:
  - `create`: validation precedence exactly as specified — container-exists (404, via
    `StoryReaderProtocol`/`TaskReaderProtocol`/`MilestoneReaderProtocol`, satisfied structurally
    by the concrete repositories) → content valid (422, backstop) → author_role non-empty (422,
    backstop) → `in_reply_to` referenced comment exists (404) → shares the same container (422).
    On a valid reply, `ancestors = parent.ancestors + [str(parent.id)]`; `content` stored
    verbatim, no server-side prefixing.
  - `update`: changes `content`/`labels` independently (only touches a field when present on the
    input); empty `labels` list clears all labels.
  - `get_by_id`, `list_paginated` (container-exists check, label filters, `descendant_of` /
    `after_id` string params coerced to UUID via a new repository method before being passed to
    TASK-001's `list_paginated`), `delete`.
  - `get_ancestors`: resolves the ordered (root-first) ancestor bodies via one `list_by_ids` call.
  - `StoryReaderProtocol`/`TaskReaderProtocol`/`MilestoneReaderProtocol` (cross-domain container
    readers) and `CommentReaderProtocol` (the reverse direction — `list_all_for_container` +
    `delete_all_for_container`) declared at module level; `CommentService` itself implements
    `CommentReaderProtocol` structurally, exactly mirroring `AttachmentService`, so TASK-004 can
    inject the concrete service into story/task/milestone services as a Protocol-typed reader
    without any further service-layer work.

**Deviations from plan**: None from the design itself (the persisted-`ancestors` reply model was
already decided by the architect). Two small, in-scope additions to TASK-001's repository were
needed to make the service work correctly and are noted below rather than deviations from this
task's own scope.

**Technical decisions made**:
- Content/author_role validation is enforced **both** as Pydantic `field_validator`s on
  `CreateComment` (primary enforcement — a well-formed request never reaches the service with
  invalid values) **and** as an explicit backstop inside `CommentService.create` (mirroring
  `AttachmentService._assert_title_not_empty`). The backstop is what makes the story's required
  precedence order (container 404 before content/author_role 422) independently verifiable
  against the service directly, and protects any future caller that constructs a `CreateComment`
  via `model_construct` or otherwise bypasses schema validation. Both backstop checks raise
  `UnprocessableError` (422), matching this story's explicit acceptance-criteria status code —
  a deliberate choice over the `ValidationError` (400) `AttachmentService` uses for its own
  title-backstop, since 422 is what STORY-008 specifies and is also the prevailing convention
  used by every other `service.py` in the codebase (task/task-link/story-link "not allowed"
  errors) — `AttachmentService`'s 400 backstop looks like an outlier, not the pattern to follow.
- Added `CommentRepository.coerce_comment_id` (mirrors the existing `coerce_container_id`/
  `coerce_task_id`/`coerce_story_id` per-repository pattern) so the service can turn the
  `after_id`/`descendant_of` list-filter strings (comment ids, not container ids) into
  `uuid.UUID` without any UUID parsing happening outside the data layer (ADR-011). Malformed
  `after_id`/`descendant_of` values surface as `NotFoundError` via this coercion, ahead of
  TASK-001's own not-found check inside `list_paginated` for a well-formed-but-missing `after_id`.
- Added an explicit `.order_by(created_at.asc(), id.asc())` to
  `CommentRepository.list_all_for_container` (TASK-001 left it unordered, matching
  `AttachmentRepository`'s equivalent method — harmless for attachments since detail views don't
  require attachment ordering, but comments must render oldest-first in detail views per
  acceptance criteria). This is the same method `CommentService.list_all_for_container`
  (the `CommentReaderProtocol` implementation) delegates to, so the fix lives once, in the data
  layer, and both the cascade-delete enumeration and TASK-004's future detail composition get
  correctly ordered results for free.
- `get_ancestors` converts the stored `ancestors` (a list of plain strings) back into
  `uuid.UUID` inline in the service rather than adding another repository helper: these ids are
  already-validated, system-generated internal data (produced by this same service at create
  time from `str(parent.id)`), never raw client input — so this is a type conversion of trusted
  data, not the kind of untrusted-input UUID coercion ADR-011 is guarding against.
- `CreateComment`'s `in_reply_to` lookup reuses the service's own public `get_by_id` (raising
  `NotFoundError` with the `"Comment '{id}' not found."` message) rather than calling the
  repository directly, avoiding a second near-duplicate not-found branch.

**Code locations**:
- `backend/app/comments/schema.py` (new)
- `backend/app/comments/service.py` (new)
- `backend/app/comments/repository.py` (added `coerce_comment_id`; added explicit chronological
  ordering to `list_all_for_container`)

**Technical debt noted**:
- None introduced by this task. Verified with a throwaway pytest file (14 cases covering create/
  reply/ancestors/update/delete/list/label-filter/`after_id`/`descendant_of`/backstop
  validations/`CommentReaderProtocol`) run against the real SQLite test DB and then deleted, since
  no permanent comments test suite exists yet (that is TASK-011, qa-automation). Baseline and
  post-implementation full-suite runs both show the same 6 pre-existing `tests/test_settings.py`
  failures (same set, same count, confirmed already present before any of this task's changes) —
  `tests/test_settings.py`'s fixtures (`SEED_DEFAULTS`, `ALL_KEYS`) still assert the pre-STORY-008
  seed (no `operator` in `participant_roles`, no `default_web_ui_role` key) and were never updated
  when TASK-005 (already `Done`) shipped the new seed. Neither this task nor its files touch
  `app/settings/*` or the seed migration; this is pre-existing test debt left over from TASK-005,
  to be closed by TASK-011 (qa-automation), not introduced or affected by this task.

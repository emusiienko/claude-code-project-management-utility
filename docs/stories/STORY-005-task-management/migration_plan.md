# Migration Plan — STORY-005 Removed Requirements

This file records every requirement removed from `description.md` during the pre-implementation
revision, with its destination and rationale.

---

## Removed requirements

### 1. Cascade-delete: links, attachments, and comments on task delete

**Original text (Acceptance Criteria 4):**
> A task can be deleted; all its links, attachments, and comments are permanently removed.

**Destination:** STORY-006, STORY-007, STORY-008 (each story adds the cascade for its own entity)

**Rationale:** TaskLink, Attachment, and Comment entities do not exist yet. The cascade-delete
contract for each entity must be stated in the story that introduces that entity, where the
implementor owns both the entity and its teardown logic. STORY-005 retains the plain task-delete
requirement (no cascade side-effects to specify).

---

### 2. `GET /tasks/:id/detail` — enriched detail endpoint

**Original text (Acceptance Criteria 5):**
> A single detail call returns the task's own fields plus all its outbound and inbound links
> (each with linked task id, title, status), all active attachments, and all comments in
> chronological order.

**Destination:** STORY-010 (Agent Access via MCP) — the primary consumer of the detail endpoint
is the MCP surface used by agents. Alternatively, this endpoint can be retrofitted in STORY-006
(first story that introduces a related collection) if the architect decides it is cleaner to
build the detail endpoint incrementally as each collection becomes available.

**Rationale:** `TaskDetail` extends `Task` with `links` (STORY-006), `attachments` (STORY-007),
and `comments` (STORY-008). None of these collections exist when STORY-005 runs, so the endpoint
cannot return a meaningful enriched shape. The plain `GET /tasks/:id` endpoint (returning the
Task entity only) is sufficient for STORY-005 and is already included in the revised criteria.

---

### 3. Edge case: empty arrays in detail response

**Original text (Edge Cases 1):**
> A task with no links, attachments, or comments returns empty arrays for those fields in the
> detail response — not an error.

**Destination:** Whichever story introduces `GET /tasks/:id/detail` (see item 2 above — STORY-006
or STORY-010).

**Rationale:** This edge case is only meaningful in the context of the detail endpoint, which has
been deferred. It should be added to the description of whichever story first introduces that
endpoint.

---

### 4. Atomic cascade-delete: links (outbound and inbound), attachments, and comments

**Original text (Edge Cases 3):**
> Deleting a task removes all its links (both outbound and inbound), attachments, and comments
> atomically.

**Destination:** STORY-006 (links — both directions), STORY-007 (attachments), STORY-008
(comments). The atomicity guarantee across all three should be restated as a combined edge case
in whichever of these stories is implemented last, or can be added as a cross-cutting edge case
to each individual story.

**Rationale:** This is the atomic-transaction form of the cascade described in item 1. It adds
the constraint that the teardown happens in a single DB transaction. Each story that introduces
a related entity should assert that its teardown is part of the task-delete transaction.

---

## Summary table

| # | Removed from | Destination | Depends on |
|---|--------------|-------------|------------|
| 1 | AC4 (cascade delete) | STORY-006, STORY-007, STORY-008 | TaskLink, Attachment, Comment |
| 2 | AC5 (detail endpoint) | STORY-010 or STORY-006 | TaskLink, Attachment, Comment |
| 3 | EC1 (empty arrays in detail) | Same story as AC5 | Detail endpoint |
| 4 | EC3 (atomic cascade) | STORY-006, STORY-007, STORY-008 | TaskLink, Attachment, Comment |

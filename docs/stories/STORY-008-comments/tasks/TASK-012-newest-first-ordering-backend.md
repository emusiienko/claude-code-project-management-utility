---
status: ToDo
assignee: backend-developer
story: STORY-008
---

# TASK-012: Flip comment list ordering to newest-first

## What to implement
Reverse the ordering of the comments domain's list queries so comments are returned **newest-first**
(most recently created first) instead of oldest-first. See the **Revision — Comment ordering is
newest-first** section of `implementation_plan.md` for the full rationale.

- The container-scoped **paginated list** must return comments in descending order of creation, so
  pagination walks newest → oldest (page 1 = the newest comments). The secondary tiebreaker on the
  comment id must flip in the same direction as the primary creation-time key, so the order stays
  stable and deterministic when several comments share a creation timestamp.
- The **enumerate-all-for-a-container** path — the one that composes the `comments` list on story,
  task, and milestone detail views — must return newest-first as well. Because detail composition
  already reads through this path, flipping it here makes all three detail views newest-first with no
  change to the story / task / milestone services.
- The **`after_id` watermark is unchanged in both name and meaning.** It must still return only
  comments created strictly *after* (newer than) the referenced comment — the same keyset predicate
  on `(created_at, id)`. Only the surrounding result order flips to descending. Do not rename it and
  do not alter its comparison direction. The deleted-watermark → 404 behavior stays as-is.
- All existing list filters (`label_key`, `label_value`, `descendant_of`, and `after_id`) must keep
  working, alone and in combination, under the new order. The `descendant_of` sub-thread list rides
  the same list query and therefore also returns newest-first — this is correct and intended.

Do **not** change ancestor-lineage ordering: the get-ancestors traversal returns ancestors
root-first (oldest ancestor → direct parent), which is a lineage path, not a chronological list, and
must stay root-first.

## Scope
Comments domain data layer only — the repository's list ordering. No schema/migration change, no
service-logic change, no API-shape change, no new endpoints. REST and MCP list surfaces inherit the
new order automatically through the shared service.

## Dependencies
None (TASK-001 through TASK-005 are `Done`). Supersedes in part the ordering behavior of TASK-001
(repository) and TASK-004 (detail composition); those `Done` tasks are not modified.

## Acceptance Criteria
- [ ] The paginated container comment list returns newest-first; page 1 contains the most recently
  created comments and pagination proceeds toward the oldest.
- [ ] Story, task, and milestone detail views return their `comments` list newest-first.
- [ ] `after_id` still returns only comments newer than the referenced one (keyset predicate and
  parameter name unchanged), now ordered newest-first; a not-found `after_id` still returns 404.
- [ ] `label_key`, `label_value`, and `descendant_of` filters still work, alone and combined, under
  the new order, on both SQLite and PostgreSQL.
- [ ] Ancestor lineage (get-ancestors) is unchanged and still returns root-first.
- [ ] REST and MCP list surfaces both reflect the new order (behavior-identical).

## Intended ADR
None — this is a product-behavior change (list direction), not an architectural decision.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

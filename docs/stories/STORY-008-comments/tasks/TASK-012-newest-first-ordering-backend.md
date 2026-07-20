---
status: Done
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
**Date**: 2026-07-20
**What was done**: Flipped both comment list `ORDER BY` clauses in `CommentRepository` from
ascending to descending on the same `(created_at, id)` key — `list_paginated` (the container-scoped
paginated list) and `list_all_for_container` (the enumerate-all helper that also feeds story/task/
milestone detail composition). Since story/task/milestone `get_detail` compose their `comments`
list through `list_all_for_container` with no service-layer changes, all three detail views now
return newest-first automatically, exactly as the implementation plan's revision anticipated. The
`after_id` watermark predicate (`(created_at, id) > (anchor_created_at, anchor_id)`, "strictly newer
than the referenced comment") was left untouched — only the surrounding `ORDER BY` direction
changed, not the keyset comparison, per the explicit instruction not to alter its name or meaning.
`get_ancestors` (via `list_by_ids`, keyed by the stored `ancestors` id list) and `delete_all_for_container`
were not touched — they don't depend on either flipped `ORDER BY` clause, so root-first lineage
ordering and cascade-delete behavior are unaffected. Updated the one in-code comment referencing
"oldest-first" in `list_all_for_container` to "newest-first" to keep the doc-comment accurate.
**Deviations from plan**: None. The change was exactly the two `ORDER BY` flips called out in the
task and the implementation plan's revision section — no schema, service, or API-shape change.
**Technical decisions made**: None beyond what the plan already specified — this task had no open
design decisions.
**Code locations**: `backend/app/comments/repository.py` — `CommentRepository.list_paginated` (line
~91, `order_by(Comment.created_at.desc(), Comment.id.desc())`) and
`CommentRepository.list_all_for_container` (line ~121, same flip).
**Technical debt noted**: None. As expected and documented in the implementation plan's revision
section, 7 pre-existing tests in `tests/test_comments.py` now fail because they assert the old
oldest-first order verbatim (`test_list_comments_oldest_first_order`,
`test_multiple_replies_to_same_comment_are_flat`, `test_list_comments_pagination`,
`test_list_comments_after_id_watermark`, `test_detail_composition_returns_comments_oldest_first`
×3 parametrizations). In every one of these, the underlying **set** of returned comments and all
filter behavior (`label_key`, `label_value`, `descendant_of`, `after_id`) is still correct — only the
list order assertion is now stale. `test_list_comments_descendant_of_returns_subthread` (which
compares as an unordered set) and `test_get_ancestors_ordered_root_first` both pass unchanged,
confirming filters and lineage ordering are unaffected. Fixing these order assertions is explicitly
scoped to TASK-014 (qa-automation), not this task. Baseline full suite: 517 passed, 2 xfailed.
Post-implementation full suite: 510 passed, 7 failed (the expected order-assertion failures above),
2 xfailed — no other regressions.

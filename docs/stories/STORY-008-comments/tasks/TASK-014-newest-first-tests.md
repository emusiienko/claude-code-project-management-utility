---
status: Done
assignee: qa-automation
story: STORY-008
---

# TASK-014: Update automated tests for newest-first ordering

## What to implement
Update the comment API tests to match the newest-first ordering delivered by TASK-012, then re-run
the suite green. This inverts ordering assertions only — it does not add new feature coverage.

**Assertions to invert (list + detail):**
- Container comment list (REST + MCP) now returns **newest-first** — the most recently created
  comment is first; pagination proceeds toward the oldest.
- Story / task / milestone detail composition now returns their `comments` list **newest-first**.

**Assertions to verify unchanged:**
- `after_id` watermark still returns only comments newer than the referenced one (same parameter,
  same meaning), now ordered newest-first; the deleted-watermark id still returns 404.
- `descendant_of` sub-thread list returns its matches newest-first (same list query).
- Ancestor traversal (`get_ancestors`) still returns ancestors **root-first** — unchanged; add or
  keep an explicit assertion that this lineage order did not flip.
- Label-key / label-value filters, cascade delete, and `default_web_ui_role` validation are
  behavior-unchanged.

## Scope
Backend API tests (REST + MCP) for the comments domain — ordering assertions. Frontend tests are
out of scope (handled in TASK-013).

## Dependencies
TASK-012 (backend ordering must be flipped before these tests can pass). Supersedes in part the
ordering assertions of TASK-011; that `Done` task is not modified.

## Acceptance Criteria
- [x] List-order and detail-composition tests assert newest-first (REST and MCP).
- [x] `after_id` tests confirm the newer-than-ref set is returned newest-first, and the
  deleted-watermark 404 still holds.
- [x] `descendant_of` order assertion updated to newest-first.
- [x] An explicit assertion confirms `get_ancestors` remains root-first.
- [x] The full comment + settings test suite passes on a clean-install database.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20
**What was done**: Inverted the 7 stale ordering assertions flagged by TASK-012's implementation
report, all in `backend/tests/test_comments.py`:
- `test_list_comments_oldest_first_order` → renamed `test_list_comments_newest_first_order`;
  asserts `[c3, c2, c1]` instead of `[c1, c2, c3]`.
- `test_list_comments_pagination` → page 1 (limit 2) now asserts `[created[2], created[1]]`
  (the two most recent) and page 2 asserts `[created[0]]` (the oldest), with an added comment
  documenting the newest→oldest pagination direction.
- `test_list_comments_after_id_watermark` → asserts `[c3, c2]` (newest-first) instead of
  `[c2, c3]`; kept the "strictly newer than the referenced comment" framing in an inline comment
  since the predicate itself is unchanged, only the surrounding order.
- `test_multiple_replies_to_same_comment_are_flat` → its trailing list-order assertion now expects
  `[reply_b, reply_a, root]` instead of `[root, reply_a, reply_b]`.
- `test_detail_composition_returns_comments_oldest_first` (×3 parametrizations:
  story/task/milestone) → renamed `test_detail_composition_returns_comments_newest_first`; asserts
  `[c2, c1]` instead of `[c1, c2]`.

Also updated `test_list_comments_descendant_of_returns_subthread` per the "assertions to verify
unchanged" list: it already passed (its correctness check used an unordered set), but per the
acceptance criterion "descendant_of order assertion updated to newest-first" I added an explicit
ordered assertion (`[reply2, reply1]`) alongside the existing set-based match/exclusion checks, with
a comment noting it rides the same list query as the container list. Left
`test_get_ancestors_ordered_root_first` untouched — it already explicitly asserts root-first lineage
order and needs no change; confirmed it still passes post-flip, satisfying the "explicit assertion
confirms get_ancestors remains root-first" criterion. Left `test_list_comments_label_key_filter`,
`test_list_comments_label_value_filter`, `test_list_comments_label_key_no_match_returns_empty_list`,
`test_list_comments_after_id_deleted_watermark_returns_404`, cascade-delete tests, and all
`test_settings.py`/`TestDefaultWebUiRole` tests untouched — all pass unchanged, confirming
behavior-unchanged per the task's second checklist. Updated the module docstring's two "oldest-first"
references (list order, detail composition) to "newest-first (TASK-012 revision)" for accuracy.
**Deviations from plan**: None. Ordering-assertion inversions only, no new coverage added, no
existing test's underlying data/setup changed — matches the task's explicit "does not add new
feature coverage" framing.
**Technical decisions made**: Renamed the two tests whose names encoded the old order
(`test_list_comments_oldest_first_order`, `test_detail_composition_returns_comments_oldest_first`)
to their newest-first equivalents rather than keeping stale names with inverted bodies, so the test
name accurately documents current behavior for future readers.
**Code locations**: `backend/tests/test_comments.py` — module docstring (lines ~10, ~22),
`test_multiple_replies_to_same_comment_are_flat`, `test_list_comments_newest_first_order` (renamed),
`test_list_comments_pagination`, `test_list_comments_after_id_watermark`,
`test_list_comments_descendant_of_returns_subthread`,
`test_detail_composition_returns_comments_newest_first` (renamed, parametrized story/task/milestone).
**Technical debt noted**: None. Full suite verified green: `backend/tests/test_comments.py` — 65
passed; full backend suite (`pytest tests/`) — 517 passed, 2 xfailed, no regressions, matching the
517/2-xfailed baseline TASK-012's report recorded before its intentional order-assertion breakage.

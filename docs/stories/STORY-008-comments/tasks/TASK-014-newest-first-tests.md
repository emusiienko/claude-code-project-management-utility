---
status: ToDo
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
- [ ] List-order and detail-composition tests assert newest-first (REST and MCP).
- [ ] `after_id` tests confirm the newer-than-ref set is returned newest-first, and the
  deleted-watermark 404 still holds.
- [ ] `descendant_of` order assertion updated to newest-first.
- [ ] An explicit assertion confirms `get_ancestors` remains root-first.
- [ ] The full comment + settings test suite passes on a clean-install database.

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

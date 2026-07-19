---
status: ToDo
assignee: qa-automation
story: STORY-008
---

# TASK-011: Automated tests for comments and the new setting

## What to implement
Write automated tests covering the comment API and the new setting, exercising both the REST and MCP
surfaces so parity is verified.

**Endpoints / operations (REST + MCP each):**
- create on story / task / milestone — happy path; empty content (422); content over 50,000 (422);
  missing/empty `author_role` (422); non-existent container (404)
- create with `in_reply_to` — valid same-container reply (persists `ancestors`); non-existent
  `in_reply_to` (404); `in_reply_to` in a different container (422)
- list — oldest-first order; pagination; `label_key` filter; `label_value` filter; filter by a key
  no comment has returns an empty list (not an error)
- list `after_id` watermark — returns only comments after the referenced one; deleted-watermark id
  returns 404
- list `descendant_of` — returns the sub-thread beneath a comment
- get one; get ancestors (ordered root-first; empty for a top-level comment)
- update — content only leaves labels unchanged; labels only leaves content unchanged; empty labels
  array clears labels; attempts to change `author_role` or `ancestors` are ignored
- delete — a comment; and cascade: deleting a story / task / milestone removes all its comments
- REST ↔ MCP parity for every operation above

**Behaviors:**
- `ancestors` is derived as `parent.ancestors + [parent.id]` and is immutable
- `author_role` is required and immutable; labels and `author_role` are never dictionary-validated
- detail composition: story / task / milestone detail return their comments oldest-first
- `default_web_ui_role`: settable at system and project scope; rejected when outside effective
  `participant_roles`; system default is `"operator"` and `participant_roles` seeds include
  `"operator"` on a clean install; clearing a project override reverts to the system value

**Edge cases:**
- filtering by an absent label key → empty list
- reply to a deleted target still creates an ordinary comment (its `ancestors` id simply dangles)
- multiple replies to the same comment, and a reply to a reply, are all ordinary flat comments

## Scope
Backend API layer (REST + MCP) for the comments domain and the settings `default_web_ui_role`
addition. Frontend UI is out of scope for this task.

## Dependencies
TASK-001, TASK-002, TASK-003, TASK-004, TASK-005 (implementation must be complete before tests can
run green).

## Acceptance Criteria
- [ ] All listed endpoints, behaviors, and edge cases have at least one test.
- [ ] REST and MCP parity is asserted for every comment operation.
- [ ] Tests pass against the running application on a clean-install database.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

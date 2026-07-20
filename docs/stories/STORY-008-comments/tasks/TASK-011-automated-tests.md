---
status: Done
assignee: qa-automation
story: STORY-008
---

# TASK-011: Automated tests for comments and the new setting

> **Superseded in part by TASK-014 (2026-07-20).** The list-order and detail-composition assertions
> here expect oldest-first; the ordering Revision in `implementation_plan.md` reversed the product
> behavior to newest-first, so those assertions are inverted by TASK-014. This task's report below is
> left unchanged. (`after_id` semantics and the root-first ancestor assertions are unaffected.)

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
**Date**: 2026-07-20

**What was done**:
- Wrote `backend/tests/test_comments.py` (65 tests, all passing): create happy path +
  validation (empty content 422, content > 50,000 chars 422, exactly 50,000 accepted,
  missing/empty `author_role` 422, non-existent container 404) across all three
  containers (story/task/milestone); `author_role`/`labels` free-form (never
  dictionary-validated); `in_reply_to` — valid same-container reply persists
  `ancestors` (`parent.ancestors + [parent.id]`), reply-to-reply accumulates ancestors
  root-first, multiple replies to the same comment stay a flat oldest-first thread,
  non-existent `in_reply_to` → 404, cross-container `in_reply_to` → 422, replying to a
  since-deleted target's ancestor dangles gracefully (delete does not cascade to
  replies; ancestor traversal silently skips the missing row); list — oldest-first
  order, pagination + meta, `label_key`/`label_value` filters (no-match → empty list,
  not an error), `after_id` watermark (incl. deleted-watermark → 404), `descendant_of`
  sub-thread filter; `GET /comments/:id` and `GET /comments/:id/ancestors` (root-first,
  empty for a top-level comment); update — content-only/labels-only independence,
  empty labels array clears, attempts to change `author_role`/`ancestors` silently
  ignored; delete (single + 404 on re-delete); cascade delete removes all comments on
  story/task/milestone deletion; detail composition returns comments oldest-first on
  all three container detail views; REST↔MCP parity for create/list/get/
  get_ancestors/update/delete, including MCP-side validation-failure and not-found
  paths (`pytest.raises(ToolError)`).
- Wrote `TestDefaultWebUiRole` in `backend/tests/test_settings.py` (the scalar
  `default_web_ui_role` setting, STORY-008/TASK-005): system PUT happy path + restore;
  reject a value outside `participant_roles` (422, message includes the rejected
  value); reject an empty string (422); project override happy path (effective GET +
  plain overrides GET both reflect it); reject a value outside the *project's
  effective* `participant_roles` after narrowing the override; clearing a project
  override via the MCP `clear_project_setting` tool (no REST route exists — known gap,
  STORY-002) reverts the effective value to the system default; MCP `set_system_settings`
  parity with REST for the scalar key.
- Fixed the 6 pre-existing `test_settings.py` failures flagged by TASK-002/003/004/005's
  implementors: `ALL_KEYS` now the full six-key settings surface (`ALL_DICT_KEYS` +
  the scalar `default_web_ui_role`), `SEED_DEFAULTS["participant_roles"]` now includes
  `"operator"` (9 entries), and every loop comparing a key's value against
  `SEED_DEFAULTS` was split so dictionary keys still use the sorted-list comparison
  while the scalar `default_web_ui_role` gets its own equality assertion against
  `SEED_DEFAULT_WEB_UI_ROLE = "operator"`. Renamed the now-inaccurate "five/six keys"
  test names/messages (`test_all_five_keys_present` → `test_all_six_keys_present`,
  etc.) to match the real key count.
- Fixed the stale `test_attachments.py::test_milestone_detail_includes_attachments_and_empty_comments`
  (flagged by TASK-004's implementor): renamed to
  `test_milestone_detail_includes_attachments_and_comments`, now creates a milestone
  comment and asserts it appears in `detail["comments"]` instead of asserting the list
  stays permanently empty (STORY-008/TASK-004 wired `CommentReader` into milestone
  detail composition). Updated the file's module docstring line that still described
  milestone detail as composing "an empty comments array".
- Updated `docs/qa-automation-strategy.md` coverage-zone table: STORY-008 row now
  describes the real `test_comments.py` coverage; STORY-002 row folds in
  `TestDefaultWebUiRole`; STORY-007 row's stale "milestone comments stay empty" phrase
  corrected to point at `test_comments.py`. Bumped rev 8 → 9.

**Deviations from plan**: None from the task's acceptance criteria. One addition beyond
the letter of the task: added `test_default_web_ui_role_is_non_empty_string` /
`test_seed_default_web_ui_role_is_operator` / `test_seed_participant_roles_includes_operator`
to `TestGetSystemSettings` (not just the dedicated `TestDefaultWebUiRole` class) so the
existing "all keys present" / "seed values match" test groups also exercise the new
scalar key and the `operator` seed addition directly, since those groups are what
originally broke.

**Technical decisions made**:
- Used `pytest.mark.parametrize("container_type", ["story", "task", "milestone"])`
  for every behavior common to all three containers (create validation, cascade
  delete, detail composition) rather than three near-duplicate test functions, mirroring
  the parametrization style already used in this suite (e.g. `test_tasks.py`).
- For MCP failure-path tests, followed the existing `test_attachments.py` precedent of
  `pytest.raises(ToolError)` without asserting on the exact error string, since fastmcp's
  wrapping of a Pydantic field-validation failure vs. a `DomainError.to_tool_error()`
  are different shapes and the REST layer's `msg`/`error` assertions already cover the
  precise messages.
- Tested `clear_project_setting` via the MCP tool only (not REST) since no REST route
  exists for it (`CLAUDE.md` known gap, STORY-002) — this is the only way to exercise
  that behavior end-to-end today.
- Did not add a dedicated regression test asserting the exact validation *precedence*
  order documented in the comments service (container-exists → content → author_role →
  in_reply_to-exists → in_reply_to-same-container), because for the REST/MCP surfaces
  Pydantic's request-body validation (`content`/`author_role` field validators)
  necessarily runs before the route handler invokes the service, so "container exists
  first" is unobservable from either public surface — it's a service implementation
  detail, not integration-testable behavior. Each precedence link is instead tested
  independently (container-not-found → 404 with valid content/author; empty content →
  422; empty author_role → 422; non-existent/cross-container `in_reply_to` → 404/422).

**Code locations**:
- `backend/tests/test_comments.py` (new file, 65 tests)
- `backend/tests/test_settings.py` (`TestDefaultWebUiRole` class added; `ALL_KEYS` /
  `ALL_DICT_KEYS` / `SEED_DEFAULTS` / `SEED_DEFAULT_WEB_UI_ROLE` constants; `_mcp_call`
  helper; every loop comparing against `SEED_DEFAULTS[key]` for a non-overridden key
  updated to iterate `ALL_DICT_KEYS` plus a separate scalar assertion)
- `backend/tests/test_attachments.py` (`test_milestone_detail_includes_attachments_and_comments`,
  module docstring)
- `docs/qa-automation-strategy.md` (coverage-zone table rows for STORY-002/007/008)

**Technical debt noted**: None new. Confirmed still open: the REST clear-override gap
(`docs/architecture.md` / `CLAUDE.md` known gap, STORY-002) — `default_web_ui_role`
inherits it exactly like the other five keys, and the only test coverage for
clear-override behavior (any key) in this suite goes through MCP.

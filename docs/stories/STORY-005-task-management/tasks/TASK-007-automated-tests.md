---
status: ToDo
assignee: qa-automation
story: STORY-005
---

# TASK-007: Automated tests

## What to implement

Write automated backend tests for the Tasks domain and the story aggregate endpoint.

**`test_tasks.py`** — a new test module covering the Tasks REST API (and optionally MCP tools). At minimum:
- Create task: happy path (all fields), required-fields-only, missing required fields (422), invalid dictionary value for type / status / assignee_role / creator_role (422), non-existent story (404)
- List tasks: returns only tasks belonging to the target story; each independent filter (status, type, assignee_role, creator_role) narrows results correctly; pagination (limit, offset) works
- Get task: happy path; non-existent ID (404); malformed UUID (404)
- Update task: partial update (only changed fields); `story_id` change attempt is rejected; invalid dictionary value (422)
- Delete task: task is gone after delete; a second delete returns 404
- Edge: `story_id` is immutable — updating it must not change the task's owning story

**`test_stories.py` additions** — extend the existing stories test module with aggregate cases:
- Aggregate for a story with tasks: `total_tasks` matches actual count; `by_status` breakdown matches distribution
- Aggregate for a story with no tasks: returns `{ total_tasks: 0, by_status: {} }` — HTTP 200
- Aggregate for a non-existent story: 404
- Aggregate refreshes after a task is created or deleted (if testing via a shared DB fixture)

## Scope

- `backend/tests/test_tasks.py` — new file
- `backend/tests/test_stories.py` — aggregate additions

## Dependencies

TASK-001, TASK-002

## Acceptance Criteria

- [ ] All create / list / get / update / delete task test cases pass against the running backend
- [ ] Invalid dictionary values for all four validated fields are rejected with 422 in the tests
- [ ] Aggregate tests cover the no-tasks case (zeros), the with-tasks case (correct counts), and the non-existent story case (404)
- [ ] No tests share mutable state across test functions (each test sets up its own fixtures)
- [ ] Test suite passes in CI without any skipped cases

## Intended ADR

None expected.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

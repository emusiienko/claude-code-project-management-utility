---
status: ToDo
assignee: qa-automation
story: STORY-006
---

# TASK-007: Automated tests

## What to implement

Write automated tests covering both link domains end to end — backend behavior on both dialects and the frontend query/UI layers.

**Endpoints / operations:**

- `POST /tasks/:taskId/links` — happy path (link created between two tasks in the same story); self-link (422); cross-story (422); `link_type` not in effective dictionary (422); duplicate source+target+type (409); missing source or target task (404); missing/empty `target_id` or `link_type` (422 request validation).
- `GET /tasks/:taskId/links` — `direction=outbound`, `direction=inbound`, `direction=both` (default) each returning correctly tagged rows; `link_type` filter; pagination; each row carries the linked-task summary (`id`, `title`, `status`).
- `DELETE /task-links/:id` — deletes by own id; deleting a non-existent link.
- `POST /stories/:storyId/links` — happy path; self-link (422); cross-project (422); `link_type` not in effective dictionary (422); duplicate (409); missing source or target story (404); request-validation failures (422).
- `GET /stories/:storyId/links` — same direction/filter/pagination/enrichment coverage as the task-link list.
- `DELETE /story-links/:id` — deletes by own id; non-existent link.
- `GET /tasks/:id/detail` — `links` populated with outbound + inbound, each enriched with linked-task `id`/`title`/`status`.
- `GET /stories/:id/detail` — `links` field present and populated with outbound + inbound, each enriched with linked-story `id`/`title`/`status`.
- MCP tools for both domains (create/list/delete) — behavior-identical to their REST counterparts.

**Behaviors:**

- Error precedence — existence (404) is reported before scope/self/dictionary (422), which is reported before duplicate (409). Verify by constructing requests that would trip multiple rules and asserting the earliest-precedence error.
- Direction semantics — a single link appears as `outbound` for the source's list and `inbound` for the target's list.
- Enrichment is batched — the linked-item summaries are correct regardless of how many links are returned (no per-row omission); assert summaries match the current linked-item state.
- Exact rejection messages — "A task cannot link to itself.", "Cannot link tasks from different stories.", "A story cannot link to itself.", "Cannot link stories from different projects.", "This link already exists."

**Edge cases:**

- Deleting a task removes all task links referencing it (source and target side) — no orphaned rows remain. Verify on both the SQLite default and PostgreSQL.
- Deleting a story removes all story links referencing it (source and target side) — no orphaned rows. Verify on both dialects.
- Effective-dictionary sourcing — a `link_type` valid only after a project-level override to `link_types` is accepted, and a value removed by an override is rejected.

**Frontend:**

- Task Detail Modal Links section — list renders outbound/inbound rows with direction indicator, `link_type` badge, and linked-task title; clicking a title navigates to the linked task's detail route; add-link form creates a link and the list refreshes; delete-with-confirmation removes a link.
- Story slide-over Links section — same coverage; clicking a linked-story title navigates to that story's slide-over route.
- The `link_type` dropdown is populated from cached effective settings without an additional network call.

## Scope

Backend: `task_links` and `story_links` domains, tasks/stories detail composition, cascade cleanup. Frontend: link query hooks and both Links sections.

## Dependencies

TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006 (implementation must be complete before tests can run green).

## Acceptance Criteria

- [ ] All listed endpoints, MCP tools, behaviors, and edge cases have at least one test.
- [ ] Cascade-cleanup tests run and pass against both the SQLite default and PostgreSQL.
- [ ] Frontend tests cover both Links sections including navigation, add, and delete.
- [ ] Tests pass against the running application.

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

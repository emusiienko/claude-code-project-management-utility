---
status: ToDo
assignee: backend-developer
story: STORY-005
---

# TASK-002: Story aggregate endpoint

## What to implement

Add `GET /stories/:id/aggregate` to the stories domain — REST route, service method, and MCP tool.

**Service** — the stories service already depends cross-domain on the milestones repository through a runtime `Protocol` to avoid circular imports; apply the exact same pattern here. Define a `TaskCounter` Protocol (or equivalent name) in the stories service module with a single method: a batched read that returns per-status counts and a total count for a given story ID. Inject this protocol-typed dependency into the stories service via `AppContainer` (backed by the concrete task repository from TASK-001). The aggregate asserts the story exists (404), then computes `{ story_id, total_tasks, by_status }` on demand — never store it. A story with no tasks returns `{ total_tasks: 0, by_status: {} }` — success, not an error.

**Controller** — add the aggregate route to the existing stories controller (it is a Stories operation, not a Tasks operation). One new route handler: `GET /v1/stories/:id/aggregate`.

**MCP tool** — add `get_story_aggregate` to the existing stories `mcp_tools.py`, behavior-identical to the REST handler.

**Schema** — `StoryAggregate` Pydantic response schema, derived exactly from the locked v1.0 API contract. No shape changes.

## Scope

- `backend/app/stories/service.py` — add `TaskCounter` Protocol + aggregate method
- `backend/app/stories/schema.py` — add `StoryAggregate` response schema
- `backend/app/stories/controller.py` — add aggregate route handler
- `backend/app/stories/mcp_tools.py` — add `get_story_aggregate` MCP tool
- `backend/app/container/` — inject task repository into stories service as `TaskCounter`

## Dependencies

TASK-001

## Acceptance Criteria

- [ ] `GET /v1/stories/:id/aggregate` returns `{ story_id, total_tasks, by_status }` for a story with tasks; counts match the actual task distribution
- [ ] A story with no tasks returns `{ total_tasks: 0, by_status: {} }` — HTTP 200, not an error
- [ ] A non-existent story ID returns 404
- [ ] The `get_story_aggregate` MCP tool returns the same result as the REST endpoint
- [ ] The stories service never imports the concrete task service — only the task repository through the Protocol

## Intended ADR

Record an ADR only if the cross-domain Protocol pattern introduces non-obvious decisions beyond the existing stories→milestones precedent; otherwise no ADR is required.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

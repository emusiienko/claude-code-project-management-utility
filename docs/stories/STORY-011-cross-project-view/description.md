---
status: Planned
type: feature
priority: P2
date: 2026-06-28
---

# STORY-011: Cross-project View

## Desired Outcome
Stories and tasks from all projects can be queried together in a single call. The orchestrator agent gets a complete picture of all in-flight work across every project without issuing one request per project.

## Context
Cross-repository coordination is the first core value driver of the utility. An orchestrator managing work across multiple codebases needs one view of all active tasks regardless of which project they belong to. Per-project queries remain the default and are not changed; cross-project queries are additive. Each returned item includes its `project_id` so the caller can group or filter client-side if needed.

## Acceptance Criteria
- [ ] Stories from all projects can be retrieved in a single paginated query; each result includes its `project_id`
- [ ] Tasks from all projects can be retrieved in a single paginated query; each result includes its `story_id` and derived `project_id`
- [ ] Both queries support the same filters as their per-project counterparts: stories support `status`, `label_key`, `label_value`; tasks support `status`, `type`, `assignee_role`, `creator_role`
- [ ] Passing a `project_id` to either cross-project query returns results identical to the per-project scoped endpoint for that project

## Edge Cases & Error Scenarios
- [ ] A cross-project query on an empty database returns an empty list and pagination metadata — not an error
- [ ] Filtering by a role or status value not present in any project's dictionary still returns any items that happen to have that exact string stored — the filter is a value match, not a dictionary lookup
- [ ] Filtering stories by status across projects matches only the `status` field value exactly; stories with null status or a different value are excluded

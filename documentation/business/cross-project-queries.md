# Cross-project Queries (data access)

## Happy Path

1. An agent (or any programmatic caller) requests stories — or, separately, tasks — across **every**
   project in a single query, instead of one project at a time.
2. Each result additionally carries which project (and, for tasks, which story) it belongs to.
3. The same filters available on the project-scoped equivalents (status, type, assignee/creator
   role, label key/value) apply here too, and the result is paginated.

## Other Scenarios

None beyond the project-scoped Stories/Tasks scenarios (see `stories.md` / `tasks.md`) — this
capability only removes the requirement to pick one project first.

## Who Can Access It

AI agents (and any other programmatic caller) via MCP/REST only.

## Business Rules

- A cross-project query still honors every filter its project-scoped equivalent supports.
- Project-scoped listing remains the default everywhere else in the product — this capability is
  additive, not a replacement.

## Known Limitations

- There is no Web UI for this — the human orchestrator has no screen to browse work across every
  project at once; the underlying data access described here is already fully available to agents.

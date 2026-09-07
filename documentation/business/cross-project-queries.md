# Cross-project Queries (data access)

## Happy Path

None — this capability was specified but never built, on any surface. There is no way, today, for
anyone or anything (Web UI or AI agent) to request stories or tasks across every project in a
single query.

## Other Scenarios

N/A — not built.

## Who Can Access It

No one. Neither the Web UI nor AI agents (MCP/REST) can perform a cross-project query — the
project-scoped equivalents (see `stories.md` / `tasks.md`) are the only way to read stories or tasks,
one project at a time.

## Business Rules

N/A — not built.

## Known Limitations

- **The entire capability is missing, not just a Web UI screen.** Earlier records of this gap
  described it as "the data access already works for agents, only the Web UI screen is a
  placeholder" — that turned out to be incorrect. Reconciling STORY-001 against the as-built API
  Contract (v1.10) confirmed neither read exists at all: a project-wide story list and a
  project-wide task list were both specified but never implemented, on any surface.
- **A related, narrower capability does exist today**: an AI agent can read one project's full
  work-state (every story, each story's tasks, per-status task counts) in a single call — see
  `ai-agent-access.md`. That is single-project, not cross-project, and does not substitute for
  browsing or filtering work across every project at once.
- Not tracked as a pending Requirement — by explicit user decision, nobody has yet decided to
  commission this work (neither the agent-side read nor a Web UI screen for it).

# AI Agent Access

## Happy Path

1. An agent starting a new session checks the utility is up with a liveness check — a call that
   never fails due to a downstream dependency, only reports whether the utility's own process is
   responding.
2. The agent then requests a single project's full work-state in one call: the project itself,
   every one of its stories, each story's tasks, and each story's per-status task counts — in one
   round trip, regardless of how many stories or tasks the project holds.
3. If the agent needs depth on one specific story or task (full content, labels, attachments,
   comments, links), it follows up with that item's own detail read.

## Other Scenarios

- **A project with no stories, or a story with no tasks**: returned as a normal, valid, empty
  result — not an error.

## Who Can Access It

AI agents, additive to every other capability they already have full read/write access to (via MCP,
on par with the Web UI). The liveness check is also usable by the Web UI.

## Business Rules

- The liveness check performs no dependency probing — it only ever reports on the utility's own
  process.
- The project work-state read deliberately omits heavier content (descriptions, labels, attachments,
  comments, links) by design, so an agent reaching for it at session startup always gets a small,
  fixed-size response regardless of how large the project has grown.

## Known Limitations

None currently known.

<!--
Business Documentation — business-facing behavior of the AI Agent Coordination Utility, as actually
built. Owned by business-analyst (this file + the capability files below + conceptual-data-model/ +
logical-data-model/). The technical/system-facing counterpart (architecture, API contract, ADRs, and
non-functional data drawn from real measurements) lives in architect's own Technical Documentation
location — see fast-sdlc-project-setup.md > Artifacts > Architecture. Non-functional characteristics
are deliberately not part of this business-facing part at all: they belong to the technical roles that
can measure them from real tests, not to business-analyst.

As-built, never a to-do list — no priorities, no story/task references. Kept true after every
Reconcile.
-->

# Business Documentation — Business-Facing Behavior — Index

| Capability | File | Summary | Access |
|---------|------|-------------|--------|
| Project Management | `project-management.md` | CRUD for projects — the top-level namespace every other module anchors to | Web UI + AI agents (MCP) — no authentication, by design |
| Settings Module | `settings.md` | Per-project configurable value dictionaries (task statuses, task types, story statuses, link types, participant roles) plus one scalar default-role setting; system defaults with project-level overrides | Web UI + AI agents (MCP) |
| Stories | `stories.md` | Top-level work containers within a project; status, labels, milestone assignment, on-demand aggregated task state, links, attachments, comments | Web UI + AI agents (MCP) |
| Board View | `board-view.md` | Kanban visualization of a project's stories grouped by status, with milestone filtering | Web UI only |
| Tasks | `tasks.md` | Atomic work items inside a story; type/status/assignee/creator role, labels, links, attachments, comments | Web UI + AI agents (MCP) |
| Work Item Linking | `work-item-linking.md` | Typed, directed links between tasks, and between stories, within the same project | Web UI + AI agents (MCP) |
| Attachments | `attachments.md` | Documents, images, curated binary files, and external references attached to a story, task, or milestone; immutable once created | Web UI + AI agents (MCP) |
| Comments | `comments.md` | Threaded discussion notes on a story, task, or milestone, with replies, `@role` mentions, and permalinks | Web UI + AI agents (MCP) |
| Sessions | `sessions.md` | Project-scoped record of an agent/human working session — start artifact, lifecycle status, optional links to a story/task, optional result artifact; permanently deletable (Web UI: archived-only) | Web UI + AI agents (MCP) |
| Milestones | `milestones.md` | Named planning markers within a project; at most one active at a time; stories optionally assigned | Web UI + AI agents (MCP) |
| AI Agent Access | `ai-agent-access.md` | Liveness check and a single-call breadth read of a project's full work state, purpose-built for agent session startup | AI agents (MCP + REST) |
| Cross-project Queries (data access) | `cross-project-queries.md` | Listing stories/tasks across every project in one query, instead of per-project only — specified but not built on any surface | Not built — no one can access this today |

Both access surfaces (Web UI, MCP) carry full read/write access to every capability above — the
utility is deliberately participant-neutral (human and agents are structurally equal) and carries no
authentication or role-based access control, by design (personal, single-developer tool; see the
Validated Idea).

See also `conceptual-data-model/` (entities + relationships, business language) and
`logical-data-model/` (complete attributes, identifiers, foreign keys, normalized) — every entity
and relationship, as built, split by subject area: Project & Work Items, Work Item Linking,
Collaboration, Sessions, Settings.

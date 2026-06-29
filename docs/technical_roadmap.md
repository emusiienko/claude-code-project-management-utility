# Technical Roadmap

Global sequencing across stories. Read by the architect (Feature Design), backend-developer,
frontend-developer, and devops. Each story still gets its own implementation_plan.md.

## Foundational prerequisite (before any feature story)

STORY-001 (Project Initiation) establishes the architecture, conventions, and infra scaffold.
Before the first feature story is implemented, the following must exist:
- Backend skeleton: app-based package layout + `core` (config, DB engine/session, error handling, app factory).
- DB-agnostic persistence wired (SQLAlchemy + Alembic, `DATABASE_URL` switch, portable UUID/JSON types).
- Docker Compose stack (api, mcp, web, optional db) — owned by devops.
- The shared service-layer pattern in place so REST controllers and MCP tools can be added per domain.

## Story Dependency Graph

- STORY-002 (Settings) → STORY-005 (Task Management): tasks validate `type`/`status`/`*_role` against effective dictionaries; the dictionary resolution + seed must exist first.
- STORY-002 (Settings) → STORY-004 (Story Management): story `status` validates against `story_statuses`.
- STORY-003 (Project Management) → STORY-004 (Story Management): a story needs its parent project + project-scoped dictionary resolution.
- STORY-004 (Story Management) → STORY-005 (Task Management): tasks belong to a story.
- STORY-005 (Task Management) → STORY-006 (Task Linking): links connect existing tasks (same project).
- STORY-003/004/005 → STORY-007 (Attachments) & STORY-008 (Comments): containers (story/task) must exist; attachments also need `core.storage` + the attachments volume.
- STORY-003/004/005 → STORY-009 (Session Tracking): sessions optionally link to existing stories/tasks.
- STORY-002…009 service layer → STORY-010 (Agent Access via MCP): MCP tools are thin layers over already-built services; the bulk of MCP exposure should follow the services it wraps. (MCP transport scaffold can be stood up early; per-domain tools track their services.)
- STORY-003 (Project Management) → STORY-011 (Cross-project View): cross-project queries span multiple projects' data.
- STORY-003 (Project Management) + STORY-004 (Story Management) → STORY-012 (Milestones): milestones associate M:N with projects and receive story assignments; milestone-id on Story requires Story to exist.

## Sequencing Notes

- **Critical path:** Settings + Project → Story → Task is the backbone; build it first and in this order.
- **Parallelizable once the backbone exists:** Attachments, Comments, Sessions, and Task Linking are largely independent of one another and can proceed in parallel after Task Management lands.
- **MCP strategy:** stand up the MCP HTTP transport scaffold during/just after the backbone, then add per-domain tools alongside (or immediately after) each domain's REST controller, since both wrap the same service. This avoids a large, late MCP "big bang."
- **Frontend** tracks the API contract (LOCKED v1.0): each screen can be built as soon as its backing endpoints exist. Projects/Stories/Tasks screens follow the backbone; Settings, Sessions, Milestones, Cross-project follow their respective backend stories.
- **Milestones (STORY-012, P1)** is last among the data-model additions because it touches Story (`milestone_id`) and reuses the attachment/comment container mechanism (`container_type = "milestone"`).

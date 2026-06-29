
---
status: Done
assignee: architect
story: STORY-001
---

# TASK-003: Setup — architect

## What to implement
Run the architect Setup workflow: design the full system architecture and produce the foundational technical documents.

## Scope
docs/architecture.md, CLAUDE.md, docs/api-contract.md, docs/technical_roadmap.md (optional), docs/team.md

## Dependencies
TASK-002

## Acceptance Criteria
- [ ] docs/architecture.md created
- [ ] CLAUDE.md created
- [ ] docs/api-contract.md created
- [ ] User has reviewed and approved the architecture

---
## Implementation Report
**Date**: 2026-06-29

**What was done**: Ran the architect Setup workflow in a face-to-face session (SESSION-003). Produced the foundational technical documents:
- `docs/architecture.md` — tech stack, monorepo layout, app-based backend modules + screen-based frontend, complete Module Relations (parent/container existence, dictionary validation, aggregation/composition, milestones, storage), data flow, DB schema with SQLite⇄PostgreSQL portability constraints + seed dictionaries, no-auth-by-design, error handling, env config, NFR targets.
- `docs/api-contract.md` — v1.0 LOCKED; all entities + endpoints formalized as TypeScript interfaces with error codes and examples (no new endpoints; formalization of requirements).
- `docs/tech_decisions/ADR-001…006` — backend stack, DB-agnostic persistence, MCP topology, app-based monorepo, attachment filesystem storage, frontend SPA.
- `docs/technical_roadmap.md` — cross-story dependency graph + sequencing.
- `CLAUDE.md` — project navigation + gotchas.
- `docs/team.md` — verified (all roles active); no change needed.

**Deviations from plan**: None. Scope matched the task. ADRs were created during Project Setup (per Mode 1), not deferred to Reconcile.

**Technical decisions made** (confirmed with user during the session):
- Backend: Python 3.12 + FastAPI (ADR-001).
- DB-agnostic persistence, configurable SQLite (default) / PostgreSQL via `DATABASE_URL`, SQLAlchemy + Alembic (ADR-002).
- MCP and REST as two thin layers (controller + MCP tools) over a shared per-app service layer; MCP over HTTP streamable transport (ADR-003).
- App-based modular-monolith backend + two-folder monorepo (ADR-004).
- Attachment content on filesystem with version snapshots (ADR-005).
- Frontend React 19 SPA (Vite), screen-based decomposition (ADR-006).
- Precise ORM layer (plain SQLAlchemy vs SQLModel) delegated to backend-developer conventions; architecture fixes only "SQLAlchemy + Alembic + DB-agnostic".
- Terminology: "controller" = REST router module; "MCP tools" = MCP-side equivalent (replaced "adapter").

**Code locations**: docs/architecture.md, docs/api-contract.md, docs/tech_decisions/ADR-001…006, docs/technical_roadmap.md, CLAUDE.md.

**Technical debt noted**:
- Open question for spec-writer: the `attachment_types` default dictionary overlaps textually with `kind` enum values (`document`, `image`, `external-ref`); semantically `type` (configurable) and `kind` (fixed enum) are orthogonal. Seed values are spec-writer's domain — kept verbatim from requirements.
- Architect extensions beyond the written requirements (flag to spec-writer at Reconcile): added composite read endpoints `GET /stories/:id/detail` and `GET /milestones/:id/detail` (entity + active attachments + comments; large child collections — tasks/stories — excluded and served by their own paginated endpoints), mirroring the existing `GET /tasks/:id/detail`. Confirmed with the user during SESSION-003.
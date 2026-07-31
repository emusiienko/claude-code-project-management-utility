---
session: SESSION-022
agent: architect
status: completed
---

## Briefing
**Goal**: Review STORY-010 (Agent Access via MCP) with the user.

**Context**: STORY-010 is the only remaining `Planned` story in `docs/stories/index.md` — no architecture work has started on it yet. Read `docs/stories/STORY-010-agent-access-mcp/description.md` for the full spec.

**Topics**: Open-ended — the user asked for a session on STORY-010 without specifying particular sub-topics in advance. Cover whatever the user wants to discuss about it.

---

## Report

**Decisions made**:
- STORY-010's outcome ("expose all operations via MCP") is **already delivered incrementally** — every domain ships a REST+MCP dual surface over one shared service layer (ADR-003), MCP is path-mounted on the shared port (ADR-007), errors are structured, not-found carries type+id, and 58 MCP tools mirror REST 1-to-1. AC #1, #2, #4, #5 and both error-shape edge cases are already satisfied.
- STORY-010 is scoped **as a bounded backend/audit story** (user's choice), reduced to two additive backend operations:
  1. **Service status** — `GET /v1/status` + `get_server_status` MCP tool; liveness + application version only. No dependency probing, no `mcp_available` flag.
  2. **Project work-state** — additive aggregate read on **both** REST + MCP (`GET /v1/projects/:id/work-state` + `get_project_work_state`): project → stories → tasks(core+status) + per-story status counts. Breadth/shallow read; depth stays in existing `get_*_detail` tools. Collapses the `1 + 1 + N + N×M` startup fan-out (AC #3 efficiency).
- Efficiency-vs-parity tension resolved: composite goes on **both** surfaces (additive **v1.9**), so the 1-to-1 MCP↔REST invariant (AC #2) holds.
- Edge case #2 ("MCP down → REST up") needs **no work** — REST and MCP share the service layer, so REST is always an independent fallback surface. No flag / fault-isolation added (user clarified the intent is simply "REST can unblock agents if MCP has bugs").
- API contract stays LOCKED during implementation; the two new shapes are documented in `implementation_plan.md` and folded into an additive **v1.9** revision at Reconcile.

**Open questions**:
- **spec-writer** to update `STORY-010 description.md` to match the reduced scope (user will trigger this separately).
- Planned ADR (author at Reconcile): aggregate "work-state" breadth-read exposed on both surfaces as a deliberate complement to per-entity CRUD.
- **Out of scope / future initiative** (orchestrator-owned): migrating the SDLC agents themselves to read/write operational state via MCP instead of git markdown — this touches agent definitions + the SDLC skill, not the backend.

**Artifacts produced this session**:
- `implementation_plan.md`
- `tasks/index.md` + `TASK-001-service-status.md`, `TASK-002-project-work-state.md`, `TASK-003-automated-tests.md` (qa-automation)

**Summary**: Reviewed STORY-010 and found its core intent already met incrementally. Reframed it as a small backend story with exactly two additive operations (status endpoint + project work-state), both on REST+MCP to preserve 1-to-1. Wrote the implementation plan and three task files. Ready for Feature Design handoff to backend-developer + qa-automation; spec-writer to align the description afterward.

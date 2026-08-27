# ADR-004: App-based modular monolith + two-folder monorepo

**Date**: 2026-06-29
**Status**: Accepted
**Decision**: Organize the backend as an app-based modular monolith — each domain (projects, stories, tasks, task_links, attachments, comments, sessions, milestones, settings) is a top-level package holding its own vertical slice (REST adapter, MCP adapter, service, models, schemas), with a `core` package at the same level for cross-cutting concerns. The repository is a monorepo with top-level `backend/` and `frontend/` folders.
**Options Considered**:
- Layer-based backend (controllers/ services/ models/ as top-level layers)
- App-based / vertical-slice backend (chosen)
- Two separate repositories for backend and frontend vs a single monorepo (chosen)
**Rationale**: User preference. Vertical slices keep each domain's REST, MCP, service, and model code co-located, which matches the per-app boundaries already implied by the data model and makes each story map to a small set of packages. A monorepo keeps the tightly-coupled REST/MCP/UI surfaces and the shared API contract in one place for a single developer.
**Trade-offs**: Vertical slices can duplicate small helpers across apps unless shared code is consciously promoted to `core`. A monorepo couples backend and frontend versioning. Internal structure within each side is owned by the respective developer (backend/frontend conventions), not fixed here.

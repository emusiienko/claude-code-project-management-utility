# Validated Business Idea — Changelog

## v1 [2026-06-27]: Initial validated idea — AI Agent Coordination Utility

First version of the validated business idea, produced through a discovery session with the product strategist.

Core findings: the primary pain point is the structural coupling between "agent writes state" and "orchestrator must approve the git diff." The utility solves this by moving all operational state outside the git repository. Two access surfaces confirmed: MCP for agents, web UI for the human orchestrator. All three modules (Tasks, Sessions, Settings) are in scope for V1. Personal use only. Success metric: zero git diff approvals for routine agent state mutations.

**Integration Points:** None — initial version
**Breaking Changes:** None — initial version
**Stories:** —

## v2 [2026-07-21]: Sessions are project-scoped; Project confirmed as universal cross-module root

During a face-to-face session (SESSION-018), triggered by a spec-review question on STORY-009 (Session Tracking), the user reflected on whether managing Projects as a freely creatable/deletable entity inside this tool was the right call, versus sourcing project identity elsewhere. Resolution: the Project entity and its CRUD model are **unchanged and reconfirmed** — the actual gap was that Project was being treated as a construct belonging to the Task Manager module, when it should be the top-level anchor for every module in the utility (Tasks and Sessions today; future modules — e.g. a test-case tracking module — tomorrow). Concretely, this means: (1) Session gains a **mandatory** project scope — a session is never created outside a project context — while `linked_story_id`/`linked_task_id` remain optional and additive, not a substitute for project scope; (2) sessions must be retrievable per project, supporting agents/orchestrator reviewing project-specific session history; (3) Project management (and the ability to connect other modules to a project) must be reachable independent of the Task Manager view — the concrete navigation/UI mechanism is an architecture/frontend decision, not specified here.

**Integration Points:** Sessions Module (STORY-009 — not yet implemented; its spec now incorporates the mandatory `project_id` and per-project retrieval, see SESSION-019). Project entity and Task Manager module: unaffected, model reconfirmed as-is.
**Breaking Changes:** None — STORY-009 has not yet been built; this refines the spec before implementation, not an as-built behavior change.
**Stories:** STORY-009

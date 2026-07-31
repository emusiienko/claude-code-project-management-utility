---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-010: Agent Access via MCP

## Desired Outcome
Agents get two focused new reads that close the remaining gaps in agent-facing operational visibility: a service status check, and a single-call breadth view of a project's full work state (its stories and their tasks). Both are additive to the existing REST + MCP surface and are exposed identically on both, so an agent using either client sees the same capability.

The broader ambition this story originally stated — "every utility operation reachable via MCP" — is **already fact**, not new work: every domain (projects, stories, tasks, settings, task links, story links, attachments, comments, milestones) already ships a REST endpoint and a behavior-identical MCP tool over one shared service layer, MCP tools already mirror REST 1-to-1, and structured not-found errors already carry resource type + id. This story adds the two operations below on top of that baseline; it does not re-deliver what already exists.

## Context
MCP is the primary access surface for all AI agents in the pipeline (architect, backend-developer, spec-writer, etc.). That access is already realised: every existing operation is reachable via MCP with no REST client or git operation required, and access is controlled by Docker port mapping to localhost with no authentication layer.

What was still missing, and what this story delivers, is narrower: agents have no lightweight way to check the service is alive and which version is running, and no single call to read a project's full work state — today that requires a `1 + 1 + N + N×M` fan-out across `list_projects` → `list_stories` → `list_tasks` → `get_task_detail`. Both gaps are closed here as small, additive backend operations. Migrating the SDLC agents themselves to read/write their own operational state via MCP instead of git markdown is explicitly out of scope — that is a separate, orchestrator-owned initiative touching agent definitions and the SDLC skill, not this story.

## Acceptance Criteria

**Already satisfied by existing code (no new work required, listed here for traceability only):**
- Every domain operation (project, story, task, settings, task-link, story-link, attachment, comment, milestone management) is already reachable via a behavior-identical MCP tool, with no REST client or git operation required.
- Each MCP tool already corresponds 1-to-1 with a REST operation; input parameters and output shapes already match the REST contract exactly.
- The MCP server already requires no authentication; access is already bounded by Docker port mapping to localhost only.

**New in this story:**
- [ ] A service status operation is available on both REST (`GET /v1/status`) and MCP, and returns liveness plus the running application version. It does not probe dependencies and carries no MCP-availability flag.
- [ ] A project work-state operation is available on both REST (`GET /v1/projects/:id/work-state`) and MCP, and in a single call returns the project together with its stories, and for each story its tasks (core fields + status) plus that story's per-status task counts.
- [ ] The work-state read replaces the `1 + 1 + N + N×M` startup fan-out with one call for breadth; it does not inline attachments, comments, or links — depth for a specific story or task is still reached via the existing `get_story_detail` / `get_task_detail` operations.
- [ ] Both new operations are exposed with identical request/response shapes on REST and MCP, preserving the existing 1-to-1 tool↔endpoint invariant.
- [ ] The work-state read is composed without an N+1 query pattern (no per-story or per-task round trip to enumerate the tree).

## Edge Cases & Error Scenarios
- [ ] A work-state request for a non-existent project id returns a not-found error carrying the resource type and id, in the same structured error shape (`error`, `code`, `details`) used by every other endpoint.
- [ ] A project with zero stories returns a work-state response with an empty stories list, not an error.
- [ ] A story with zero tasks returns that story's task list empty and its per-status counts all zero, not an error.
- [ ] If the MCP server fails to start or misbehaves, the REST API continues to function independently — this already holds today because REST and MCP share one service layer, so no new flag or fault-isolation mechanism is introduced by this story.

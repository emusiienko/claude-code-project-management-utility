# Implementation Plan: STORY-010 — Agent Access via MCP

## Context
STORY-010 asks for full agent access to every utility operation via MCP. Review session SESSION-022 established that this outcome has been delivered **incrementally**: every domain already ships a REST + MCP dual surface over one shared service layer (ADR-003), the MCP server is path-mounted on the shared port (ADR-007), errors are structured (`error` / `code` / `details`), not-found errors already carry resource type + id, and 58 MCP tools mirror the REST surface 1-to-1. Acceptance criteria #1, #2, #4, #5 and both error-shape edge cases are therefore already satisfied by prior stories.

Two genuine gaps remain, and this story closes exactly those:
- No application-level status operation exists (edge case #1's "a status endpoint").
- The startup read of a project's full work state is an `1 + 1 + N + N×M` fan-out across `list_projects` → `list_stories` → `list_tasks` → `get_task_detail` (criterion #3's efficiency).

**Out of scope** (a separate, orchestrator-owned initiative): migrating the SDLC agents themselves to read/write operational state through MCP instead of git markdown. The MCP surface is fully capable; wiring the agents to use it touches agent definitions and the SDLC skill, not the backend.

Edge case #2's real intent — REST stays usable to unblock agents if MCP misbehaves — needs **no work**: REST and MCP share the service layer, so REST is an independent, always-available surface regardless of the MCP mount. No availability flag and no fault-isolation machinery are added.

## Technical Approach
Two additive backend operations, each exposed on **both** the REST and MCP surfaces so the 1-to-1 tool↔endpoint invariant (criterion #2) holds. Logic lives in the service layer; REST route and MCP tool stay thin and behavior-identical.

**1. Service status.** A lightweight operation reporting service liveness and the running application version. It probes no dependencies and carries no MCP-availability flag. Exposed as a REST endpoint under the `/v1` prefix and as an MCP tool returning the identical shape.

**2. Project work-state (breadth read).** A single aggregate read that, given a project id, returns the project together with its stories, and for each story its tasks (core fields + status) plus the story's task status-count aggregate. It is a **shallow, broad** read: it does not inline heavy per-entity payloads (attachments, comments, links). Depth remains served by the existing `get_story_detail` / `get_task_detail` tools, called targeted on the one entity an agent is about to act on. This collapses the startup sequence into one work-state call plus a few targeted detail reads.

The aggregate is composed inside the service layer over the existing repositories, using batched queries (the story task-count aggregate already batches via GROUP BY) to avoid per-story / per-task round trips. The composite reads the full project tree as one logical operation rather than exposing page/limit parameters; internally it must enumerate stories and tasks without an N+1 pattern.

Both operations are **additive** to the API contract. The contract is LOCKED; the new shapes are documented in this plan and folded into a v1.9 additive revision at Reconcile — `docs/api-contract.md` is not edited during implementation.

## Ordered Tasks
1. TASK-001: Service status operation (REST + MCP) — a `/v1` status read (liveness + version) mirrored as an MCP tool; no dependency probing, no flags.
2. TASK-002: Project work-state aggregate read (REST + MCP) — a service-layer breadth aggregation (project → stories → tasks core + per-story status counts) exposed on both surfaces, composed without N+1.
3. TASK-003: Automated tests for both operations (depends on TASK-001, TASK-002) — REST/MCP parity, work-state shape, and error/edge cases.

## Planned ADRs
| Decision Area | Trigger Condition |
|---|---|
| Aggregate "work-state" breadth-read as a deliberate complement to per-entity CRUD, exposed on both surfaces to preserve the 1-to-1 MCP↔REST invariant | Confirmed once the work-state operation is implemented |

## Constraints & Gotchas
- Contract is LOCKED — do not edit `docs/api-contract.md` during implementation; both new shapes land as an additive v1.9 revision at Reconcile.
- Work-state must avoid N+1: reuse the batched task status-count path and enumerate tasks per project without a query per story/task.
- Work-state is a breadth read only — keep attachments / comments / links out of it; depth stays in the existing detail tools.
- Keep REST and MCP behavior-identical for both operations — logic in the service, not the controller or the MCP tool.
- The status operation stays dependency-probe-free — it must not introspect or ping the MCP mount; it reports process liveness + version only.
- No MCP-availability flag and no startup fault-isolation — explicitly out of scope per SESSION-022.
- Version value: source from the application config / package metadata; the exact source is the implementor's choice.

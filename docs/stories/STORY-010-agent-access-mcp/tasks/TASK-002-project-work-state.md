---
status: ToDo
assignee: backend-developer
story: STORY-010
---

# TASK-002: Project work-state aggregate read (REST + MCP)

## What to implement
A single aggregate read that, given a project id, returns the project together with its stories, and for each story: its tasks (core fields + status) and the story's task status-count aggregate. It is a **breadth read — shallow** — and must not inline per-entity attachments, comments, or links. Compose the aggregate in the service layer over existing repositories, reusing the batched task status-count path and enumerating tasks without a per-story or per-task query (no N+1). Expose the operation on both the REST surface (a project-scoped read) and as an MCP tool, behavior-identical via shared service logic. A request for a non-existent project returns the standard not-found error carrying the resource type and id.

## Scope
Backend: projects / stories / tasks service composition + a new aggregate read; REST route + MCP tool. No contract-file edits.

## Dependencies
None

## Acceptance Criteria
- [ ] Given a valid project id, the operation returns the project, its stories, and each story's tasks (core + status) plus the story's status-count aggregate — in one call
- [ ] Heavy payloads (attachments, comments, links) are not inlined
- [ ] REST and MCP return the identical shape via shared service logic
- [ ] A non-existent project id returns the standard not-found error with resource type and id
- [ ] The composition issues no per-story or per-task query (no N+1); task status counts reuse the existing batched aggregate
- [ ] The new shapes are documented in `implementation_plan.md` only; `docs/api-contract.md` is not edited

## Intended ADR
Aggregate "work-state" breadth-read exposed on both surfaces, preserving the 1-to-1 MCP↔REST invariant (to be authored at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

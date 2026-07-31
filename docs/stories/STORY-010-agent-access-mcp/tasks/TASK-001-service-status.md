---
status: ToDo
assignee: backend-developer
story: STORY-010
---

# TASK-001: Service status operation (REST + MCP)

## What to implement
A lightweight status operation that reports service liveness and the running application version. It returns a small fixed payload — a status indicator plus the application version string. It performs no dependency checks, probes nothing, and carries no MCP-availability flag. Expose it two ways over shared logic: as a REST endpoint under the `/v1` prefix, and as an MCP tool, both returning the same shape and following the project's standard success envelope.

## Scope
Backend: a new status concern (service + REST route + MCP tool). Application config / package metadata as the version source.

## Dependencies
None

## Acceptance Criteria
- [ ] A REST call under `/v1` returns a success response containing a status indicator and the application version
- [ ] An MCP tool returns the identical shape via the same underlying logic
- [ ] The operation performs no dependency probing and exposes no availability flag
- [ ] Response follows the project's standard success envelope

## Intended ADR
None

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
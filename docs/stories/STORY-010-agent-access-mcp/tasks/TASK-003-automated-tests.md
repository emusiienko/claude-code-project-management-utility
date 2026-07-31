---
status: ToDo
assignee: qa-automation
story: STORY-010
---

# TASK-003: Write automated tests

## What to implement
Write automated tests covering the following:

**Operations (REST + MCP):**
- Service status — success returns a status indicator + application version
- Project work-state — happy path (valid project), non-existent project

**Behaviors:**
- REST and MCP return identical shapes for both operations (surface parity)
- Work-state returns project → stories → tasks (core + status) + per-story status-count aggregate in a single call
- Work-state omits heavy payloads — attachments, comments, and links are not present in the response

**Edge cases:**
- Work-state on a non-existent project → not-found error carrying resource type + id
- Work-state on a project with no stories → project + empty stories list
- Work-state on a story with no tasks → story + empty tasks list + zeroed status counts

## Scope
Backend REST + MCP surfaces for the two new STORY-010 operations (status, work-state).

## Dependencies
TASK-001, TASK-002

## Acceptance Criteria
- [ ] All listed operations and behaviors have at least one test
- [ ] REST/MCP parity is asserted for both operations
- [ ] Tests pass against the running application

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
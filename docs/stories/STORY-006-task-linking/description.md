---
status: Planned
type: feature
priority: P1
date: 2026-06-28
---

# STORY-006: Task Linking

## Desired Outcome
Tasks can be connected with typed directed relationships — for example "depends on" or "provides context for". The utility records these links as facts and makes them visible; it does not enforce them as blocking rules or affect task availability.

## Context
Links allow agents and the orchestrator to express semantic relationships between tasks in the same project. Direction matters: "A depends on B" is distinct from "B depends on A". Link types come from the project's effective `link_types` dictionary. The utility is deliberately passive — it stores and surfaces dependency data but never prevents a task from being worked on because of a link.

## Acceptance Criteria
- [ ] A typed directed link can be created between two tasks in the same project; the `link_type` must be in the project's effective `link_types` dictionary
- [ ] Links for a task can be listed (outbound, inbound, or both directions); each result includes the linked task's id, title, and current status
- [ ] A link can be deleted
- [ ] Duplicate links (same source task, same target task, same type) are rejected with a conflict error

## Edge Cases & Error Scenarios
- [ ] Attempting to link a task to itself is rejected: "A task cannot link to itself."
- [ ] Attempting to link tasks from different projects is rejected
- [ ] Using a `link_type` value not in the project's dictionary is rejected with a validation error
- [ ] Deleting a task also deletes all its outbound and inbound links — no orphaned link records remain

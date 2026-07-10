---
status: ToDo
assignee: frontend-developer
story: STORY-012
---

# TASK-004: Milestone status controls + confirmation

## What to implement

Add lifecycle controls to the Milestones tab list.

- Each milestone row offers actions to activate it (→ `Active`) and to mark it finished (→
  `Finished`), driven by the milestone activate / finish action endpoints.
- Activating a milestone when another milestone in the same project is already `Active` shows a
  confirmation dialog naming the currently active milestone; on confirm, activate (the backend
  demotes the previous one to `Planned` atomically) and refresh the list so exactly one row shows
  `Active`. Cancel makes no change.
- A `Finished` milestone can be re-activated through the same confirmation flow.
- Visually distinguish the `Active` milestone row in the list.

## Scope

Frontend Milestones tab — status action controls and the confirmation dialog. Consumes the
activate / finish action endpoints built in TASK-002.

## Dependencies

TASK-003

## Acceptance Criteria

- [ ] Each milestone can be activated and finished from the tab
- [ ] Activating over an already-active milestone shows a confirmation naming the current active one;
      on confirm the previous milestone reverts to `Planned` and only one row is `Active`
- [ ] A `Finished` milestone can be re-activated via the same confirmation flow
- [ ] The `Active` milestone row is visually distinguished

## Intended ADR

None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

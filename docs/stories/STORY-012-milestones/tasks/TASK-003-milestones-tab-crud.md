---
status: ToDo
assignee: frontend-developer
story: STORY-012
---

# TASK-003: Milestones tab — list + CRUD

## What to implement

Replace the Milestones placeholder at `/projects/:id/milestones` (rendered inside ProjectShell) with
the real Milestones tab.

- The tab is always present in the project sub-navigation regardless of whether milestones exist.
- List all milestones for the project, showing for each: name, a status badge (`Planned` / `Active`
  / `Finished` — capitalised for display from the lowercase wire value), story count, and a truncated
  description.
- When the project has no milestones, show an empty state inviting the user to create one.
- Create, edit (name + description only — the project is fixed), and delete milestones. Deleting a
  milestone must not delete its stories (the backend clears their assignment); reflect the updated
  story counts after mutations.
- Surface the backend name-conflict error (409) inline on the create/edit form.

## Scope

Frontend Milestones feature under the project sub-nav. Consumes the milestone REST endpoints. Status
controls (activate/finish) are TASK-004; this task covers list + CRUD only.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] Milestones tab always present in the project sub-nav
- [ ] List shows name, status badge, story count, and truncated description per milestone
- [ ] Empty state shown when the project has no milestones, inviting creation
- [ ] Create / edit (name + description) / delete work; name conflict (409) shown inline
- [ ] Deleting a milestone removes it without removing its stories

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

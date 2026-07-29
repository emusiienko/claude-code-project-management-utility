---
status: ToDo
assignee: frontend-developer
story: STORY-009
---

# TASK-006: Sessions screens — list, create, detail, archive

## What to implement
The Sessions UI, scoped to a single active project. There is no cross-project Sessions view anywhere.

**Navigation placement.** Surface Sessions as a distinct top-level app mode, reached through the
existing app-switcher's `Sessions` entry — a separate space beside Task Manager over the shared
project namespace (the Confluence-beside-Jira model). Within Sessions mode, present a left-placed
project-selection surface (project list + last-visited memory, reusing the existing project-selection
machinery); selecting a project shows that project's session list in the main view, and opening a
session shows its detail as a nested view within Sessions mode. Build this out from the existing
`features/sessions/` placeholder, `Sessions` app-switcher entry, and `/sessions` route. Keep Sessions
routes in the Sessions subtree (e.g. under `/sessions`), separate from Task Manager's
`/projects/:projectId/*` sub-nav. The global Projects and Config overlays stay available here as in
Task Manager. You choose the exact route shape and detail chrome (dedicated page vs. slide-over) within
the frontend conventions. Invariants: every list and detail is project-scoped; a project is chosen
before its sessions appear; and clicking a linked story/task navigates to that item's own detail view
in Task Manager.

**Sessions list** (active project): rows show topic, status, participant_role, a linked-story/task
indicator (clickable → the item's detail), created_at, and a completion indicator driven directly by
`is_complete` (complete / pending). Controls: an "incomplete only" filter, a "linked to story" filter
(independently combinable), pagination, and an archive row action. Show an explicit empty state ("No
sessions yet") when the project has no sessions (not an error).

**Create session** form: topic (required), goal (required — the purpose the session was created for),
context, status, participant_role (required — a dropdown populated from the project's effective
`participant_roles`, not free text), and an optional link to a story or task in the active project.
`project_id` is implicit (the active project) and never a user field. No `is_complete` control — every
session starts incomplete.

**Session Detail view**: the full record — topic, goal, context, status, participant_role, linked
story/task, result_decisions, result_summary, `is_complete`, created_at, updated_at. Every updatable
field is editable: topic (non-empty, cannot be cleared), goal (non-empty, cannot be cleared),
participant_role (re-selected from the dictionary dropdown, cannot be cleared), context, status, linked
story/task, result_decisions, result_summary, plus a "Mark complete / Mark incomplete" toggle for
`is_complete` and an archive action. An archived session still shows its full record and stays fully
editable. A linked item title may be resolved on demand via the existing story/task queries; clicking it
navigates away to that item's detail.

Surface server validation messages inline (e.g. participant_role not allowed, topic length). Use the
hooks from TASK-005 for all data access.

## Scope
`frontend/src/features/sessions/` (screens/components), and the routing/navigation wiring for the
project-scoped Sessions surface.

## Dependencies
TASK-005

## Acceptance Criteria
- [ ] Sessions list is project-scoped, shows the completion indicator from `is_complete`, supports the
      independently-combinable "incomplete only" and "linked to story" filters + pagination, offers an
      archive row action, and renders the "No sessions yet" empty state.
- [ ] Create form captures topic / goal / context / status / participant_role (dictionary dropdown) /
      optional story or task link, with `project_id` implicit and no `is_complete` control; topic and
      goal are both required.
- [ ] Detail view shows the full record and edits every updatable field, including the
      complete/incomplete toggle and archive; topic, goal, and participant_role cannot be cleared; an
      archived session remains fully editable.
- [ ] Clicking a linked story/task navigates to that item's own detail view.
- [ ] Sessions is a distinct app mode reached via the app-switcher's `Sessions` entry, with its own
      left-placed project-selection surface; a project is chosen before its sessions are shown, and the
      pre-existing `features/sessions/` placeholder / `/sessions` route is grown into this space.

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

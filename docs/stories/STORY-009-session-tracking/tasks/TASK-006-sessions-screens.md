---
status: Done
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
**Date**: 2026-07-29
**What was done**: Built out Sessions into a full, distinct top-level app mode over the TASK-005 data
layer. Routing: `SessionsShell` (sidebar + outlet, mirrors `AppShell`), `SessionsSidebar` (mirrors
`ProjectSidebar` but with its own collapsed-state and last-visited-project localStorage keys so it
never interferes with Task Manager's), `SessionsIndexRedirect` (mirrors `RootRedirect`'s decision
tree — last-visited → first project → empty state), and `SessionsProjectGate` (mirrors `ProjectShell`'s
project-id validation: loading/not-found/error, then an `Outlet`). Router wired as
`/sessions` (`SessionsShell`) → index `SessionsIndexRedirect` / `:projectId` (`SessionsProjectGate`)
→ index `SessionListPage` / `:sessionId` `SessionDetailPage` — replacing the old flat
`/sessions` → placeholder-page route. Deleted the superseded `SessionsPage.tsx` placeholder.
Feature: `SessionListPage` (incomplete-only + linked-story filters, independently combinable, plus an
"include archived" toggle so an archived session stays reachable from the list — needed to exercise the
"archived session detail stays editable" edge case at all; pagination; create button + `SessionModal`;
archive row action + `ArchiveSessionDialog`); `SessionDetailPage` (full record read view, an Edit toggle
swapping in `SessionEditForm` for every updatable field except `is_complete`, an independent
"Mark complete/incomplete" toggle button, and an Archive action — an archived session's record stays
fully visible and editable, matching the edge case); `SessionForm`/`SessionEditForm` (topic/goal/context/
status/participant_role — dictionary dropdown from the project's effective `participant_roles` — plus
`LinkedItemSelector`); `LinkedItemSelector` (none/story/task radio; story mode is a single project-scoped
dropdown; task mode is two-step — pick the task's story, then the task within it, since tasks are
story-scoped with no project-wide task list endpoint; resolves an already-linked task's owning story via
`useTask` so editing pre-selects correctly); `LinkedItemDisplay` (resolves a linked story/task's title
on demand via the existing `useStory`/`useTask` queries and navigates to its Task Manager detail view,
using the session's own `project_id` — a task link doesn't carry a project id itself, but the session
already scopes it); `SessionList` (table: topic/status/participant_role/linked item/created_at/
completion badge/archive action; loading/error/"No sessions yet" empty states); `SessionModal`/
`ArchiveSessionDialog` (native `<dialog>`, mirroring `MilestoneModal`/`DeleteMilestoneDialog`).
**Deviations from plan**: The task's AC list only requires "incomplete only" and "linked to story"
filters; I added an "include archived" checkbox to the list filter bar beyond that literal list — without
it, an archived session becomes unreachable from the UI (the description's own edge case, "opening the
Session Detail view for an archived session still shows its full record," has no other way to be
exercised, since Detail is only reached by clicking a list row). No other deviations.
**Technical decisions made**: Session Detail is a dedicated full page (not a slide-over), nested inside
`SessionsShell` so the project sidebar stays visible — chosen over a slide-over since Sessions has no
existing Story/Task-slide-over precedent to extend and a full page keeps the many long-text result
fields comfortably readable. Cross-feature hook imports (`useStories`, `useTask`, `useTaskList` from
`features/stories`/`features/tasks`) follow the already-established precedent in this codebase (e.g.
`AddStoryLinkForm` importing `useStories` directly, `MilestoneAssignment` importing
`useProjectMilestones`) rather than adding new `shared/hooks/` re-export shims, since those precedents
already treat direct cross-feature hook imports as acceptable (unlike components, which the conventions
explicitly restrict to feature/shared visibility levels).
**Code locations**: `frontend/src/app/SessionsShell.tsx`, `SessionsSidebar.tsx`,
`SessionsIndexRedirect.tsx`, `SessionsProjectGate.tsx`, `frontend/src/app/router.tsx` (Sessions subtree
rewired); `frontend/src/features/sessions/SessionListPage.tsx`, `SessionDetailPage.tsx`,
`components/SessionList.tsx`, `SessionForm.tsx`, `SessionEditForm.tsx`, `SessionModal.tsx`,
`ArchiveSessionDialog.tsx`, `LinkedItemSelector.tsx`, `LinkedItemDisplay.tsx`,
`utils/errorMessages.ts`. Deleted: `frontend/src/features/sessions/SessionsPage.tsx`.
**Technical debt noted**: None beyond the pre-existing, documented gap that there is no cross-project
task list endpoint (constrains `LinkedItemSelector`'s two-step task picker to story-then-task, consistent
with how Task Links/Story Links already work elsewhere in the app). `npm run build` (tsc --noEmit + vite
build) and the full `vitest run` suite (252/252, unchanged from baseline) both pass with no regressions.

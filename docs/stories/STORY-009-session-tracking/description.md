---
status: Planned
type: feature
priority: P1
date: 2026-06-28
---

# STORY-009: Session Tracking

## Desired Outcome
Working sessions between the orchestrator and an agent can be recorded within a project. Each session captures what the session was about (topic and context), an optional result (decisions and summary), and an optional link to a story or task within that project. Sessions that were started but never concluded are discoverable in a single query scoped to the active project — even after a server restart — so an orchestrator agent never loses track of pending work in that project.

## Context
Sessions provide cross-restart continuity. When an orchestrator agent starts a new Claude Code session, it queries for incomplete sessions to know whether any prior working sessions (within its current project) are awaiting a result. A session is considered incomplete when both `result_decisions` and `result_summary` are null.

Every session belongs to exactly one project — a session is never created "just for its own sake" outside a project context. `linked_story_id`/`linked_task_id` are optional and additive: they let a session point at a specific story or task within that same project, but they are never a substitute for the project scope, which is always present.

<!-- amended: 2026-07-21 (SESSION-019, direct user decision) — sessions are reviewed within a single active project, the same way Task Manager scopes stories and tasks to one project at a time. There is no cross-project session listing or cross-project incomplete-sessions query; every session read is scoped to a chosen project_id. This narrows the "sessions retrievable per project, in addition to cross-project queries" capability described in validated-business-idea/latest.md (v2) — that document has not yet been updated to match and should be reconciled by product-strategist. -->

## Acceptance Criteria
- [ ] A session can be created with a required `project_id` (the project it belongs to), a required topic (1–500 chars), optional context text, optional status (free-form string), optional `participant_role` (free-form string), and optional links to a story (`linked_story_id`) or task (`linked_task_id`) within that same project
- [ ] A session's `topic` cannot be changed after creation; any attempt to change it via update is ignored — only `context`, `status`, `participant_role`, `linked_story_id`, and `linked_task_id` can be updated after creation, independently of the result fields. Omitting one of these fields in an update leaves it unchanged; sending it explicitly as `null` clears it
- [ ] A session's result can be recorded by setting `result_decisions` and/or `result_summary` independently via update; setting only one field is valid and does not make the session complete unless the other field was already set
- [ ] All incomplete sessions (both `result_decisions` and `result_summary` are null, and not archived) **for a given project** can be retrieved in a single query, scoped to that project; this query works correctly after server restarts. There is no cross-project variant of this query
- [ ] Sessions can be listed with pagination, always scoped to a single project — there is no cross-project session listing; archived sessions are excluded by default but retrievable with an explicit flag
- [ ] A session can be archived; archived sessions do not appear in default listings or incomplete queries
- [ ] A session without any linked story or task is valid — the project link alone is sufficient

## UI Behavior
<!-- new: 2026-07-21 (SESSION-019) — the pre-existing "Sessions View" forward-spec in requirements/requirements_web.md predates the project-scoping decision and describes a flat, cross-project list with no dedicated detail view; it is superseded by this section for STORY-009's implementation and will be brought in line with it at Reconcile. -->
- Sessions are viewed and managed within the context of a single active project — consistent with the mandatory `project_id` scope, there is no cross-project Sessions view anywhere in the UI. (Where exactly this sits in the app's navigation — e.g. a project sub-nav tab alongside Stories/Board/Milestones/Settings — is left to architecture/frontend design, not specified here.)
- **Sessions list**, scoped to the active project: shows topic, status, participant_role, linked story/task (clickable), created_at, and a completion indicator (complete / pending); supports an "incomplete only" filter and pagination
- **Create session**: a form capturing topic (required), context, status, participant_role, and an optional link to a story or task within the active project; `project_id` is implicit — the active project — never a field the user fills in directly
- **Session Detail view**: a dedicated view, opened by selecting a session from the list, showing the full session record — topic (read-only), context, status, participant_role, linked story/task, result_decisions, result_summary, created_at, updated_at. From here the user can edit every updatable field (context, status, participant_role, linked story/task, result_decisions, result_summary) and archive the session
- Clicking a linked story or task inside the Session Detail view navigates to that item's own detail view, consistent with the cross-linking conventions used elsewhere in the app (e.g. Story/Task links)
- Archiving a session is available both as a row action in the list and from within the Session Detail view

## Edge Cases & Error Scenarios
- [ ] A session with `result_decisions` set but `result_summary` null is **not** incomplete — only sessions where **both** result fields are null qualify as incomplete
- [ ] Creating a session without a `project_id` is rejected as a validation error; creating one with a `project_id` that does not reference an existing project is rejected as not-found
- [ ] Linking a session to a story or task that does not exist is rejected with a not-found error
- [ ] Linking a session to a story or task that belongs to a **different** project than the session's own `project_id` is rejected as invalid
- [ ] A session linked to a story that is later deleted retains the session record; `linked_story_id` becomes null automatically (same behavior for a deleted linked task and `linked_task_id`)
- [ ] When a project is deleted, every session belonging to that project is deleted along with it
- [ ] Archiving an already-archived session is rejected: "Session is already archived."
- [ ] Session `status` and `participant_role` are free-form strings — neither is validated against any dictionary
- [ ] Opening the Session Detail view for an archived session still shows its full record and keeps every updatable field editable — archiving does not restrict editing
- [ ] The Sessions list shows an explicit empty state ("No sessions yet") when the active project has no sessions — not an error

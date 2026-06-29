---
status: Planned
type: feature
priority: P1
date: 2026-06-28
---

# STORY-009: Session Tracking

## Desired Outcome
Working sessions between the orchestrator and an agent can be recorded. Each session captures what the session was about (topic and context), an optional result (decisions and summary), and an optional link to the story or task it relates to. Sessions that were started but never concluded are discoverable in a single query — even after a server restart — so an orchestrator agent never loses track of pending work.

## Context
Sessions provide cross-restart continuity. When an orchestrator agent starts a new Claude Code session, it queries for incomplete sessions to know whether any prior working sessions are awaiting a result. A session is considered incomplete when both `result_decisions` and `result_summary` are null. Sessions are a top-level entity — they do not belong to a project.

## Acceptance Criteria
- [ ] A session can be created with a required topic (1–500 chars), optional context text, optional status (free-form string), optional `participant_role` (free-form string), and optional links to a story (`linked_story_id`) or task (`linked_task_id`)
- [ ] A session's result can be recorded by setting `result_decisions` and/or `result_summary` independently via update; setting only one field is valid and does not make the session complete unless the other field was already set
- [ ] All incomplete sessions (both `result_decisions` and `result_summary` are null, and not archived) can be retrieved in a single query; this query works correctly after server restarts
- [ ] Sessions can be listed with pagination; archived sessions are excluded by default but retrievable with an explicit flag
- [ ] A session can be archived; archived sessions do not appear in default listings or incomplete queries
- [ ] A session without any linked story or task is valid

## Edge Cases & Error Scenarios
- [ ] A session with `result_decisions` set but `result_summary` null is **not** incomplete — only sessions where **both** result fields are null qualify as incomplete
- [ ] Linking a session to a story or task that does not exist is rejected with a 404
- [ ] A session linked to a story that is later deleted retains the session record; `linked_story_id` becomes null automatically
- [ ] Archiving an already-archived session is rejected: "Session is already archived."
- [ ] Session `status` and `participant_role` are free-form strings — neither is validated against any dictionary

---
session: SESSION-015
agent: spec-writer
status: completed
---

## Briefing
**Goal**: General review of STORY-008 (Work Item Comments) spec before it moves to architecture.

**Context**: Orchestrator ran the dashboard check — no stories pending approval, no accepted stories awaiting reconcile, no active wait. Three stories are `Planned` with no implementation plan or tasks yet: STORY-008 (Work Item Comments), STORY-009 (Session Tracking), STORY-010 (Agent Access via MCP). The user chose to open a face-to-face session with spec-writer to review STORY-008 specifically. The user asked for a general review — no specific point was flagged for reconsideration.

**Topics**: Review `docs/stories/STORY-008-comments/description.md` for completeness, clarity, and readiness to hand off to the architect. Confirm acceptance criteria and edge cases are unambiguous and traceable, and adjust the spec as needed.

---

## Report

**Decisions made**:
- Comments now attach to **stories, tasks, and milestones** (three containers), closing the gap left open since STORY-007/012 where the milestone detail view returned an always-empty `comments` list. `requirements_backend.md` currently scopes comments to story/task only and will be updated at reconcile.
- `author_role` is now **mandatory** on every comment, for every caller (Web UI, REST, MCP) — no server-side fallback for anyone, including the Web UI. It is **immutable** once set (matching `Attachment.author_role`), but its value is never dictionary-validated on the comment itself.
- New setting, the **default Web UI role** — deliberately named/scoped generically (not comments-specific) so a future story can reuse it for another entity's author/creator field. Follows the same system-default + project-override resolution as the five existing dictionaries; its value must be one of the effective `participant_roles`. System default is `"operator"`, a new entry added to the `participant_roles` seed representing the human orchestrator (vs. an AI agent role) — and, as a natural side effect, selectable anywhere `participant_roles` is used (e.g. Task `assignee_role`/`creator_role`).
- **`@role` mentions**: Web UI-only authoring convenience in comment content — autocomplete combobox (built to the ARIA combobox pattern, since it's the app's first non-native dropdown) sourced from `participant_roles`; purely textual, no schema impact; recognized mentions are highlighted at render time, unrecognized tokens render as plain text.
- **Comment permalinks & replies**: no `parent_comment_id`, no thread data model. Every comment gets a shareable deep link (scroll-to + highlight on open, toast confirmation on copy). **Reply** pre-fills the Add Comment form with a Markdown link back to the original (Web UI) or, for REST/MCP callers, an optional request-only `in_reply_to` comment-id input has the server prepend the same link server-side — giving agents reply parity without needing to know the frontend's URL scheme. Replies are ordinary comments; the thread stays flat and oldest-first.
- Full REST/MCP parity confirmed as a requirement for all five comment operations (create/list/get/update/delete), needed so agents can both reply and resolve mentions/replies back to the original comment.
- Explicitly declined for this round: a data migration to backfill `"operator"` into existing installations' stored `participant_roles` (user chose not to include it now).

**Open questions**: None outstanding — user confirmed all points raised during the session (milestone scope, default-role settings scope/format, mention rendering, immutability, reply mechanism, final polish items).

**Summary**: STORY-008's `description.md` was substantially expanded from its original minimal draft: mandatory+immutable `author_role` with a new reusable "default Web UI role" setting, `@role` mentions with accessible autocomplete, and a schema-free comment permalink/reply mechanism (including REST/MCP reply parity via `in_reply_to`). The story now includes a dedicated UI/UX section (a deviation from the usual story format, done at the user's explicit request). Status remains `Planned`; ready for architecture handoff. Divergences from the currently-locked `requirements_backend.md`/`requirements_web.md` (author_role optionality, milestone container support) are flagged inline in the story's Context section for reconciliation once accepted.
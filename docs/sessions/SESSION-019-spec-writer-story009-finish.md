---
session: SESSION-019
agent: spec-writer
status: completed
---

## Briefing
**Goal**: Finish the STORY-009 (Session Tracking) spec review that SESSION-017 left incomplete.

**Context**: SESSION-017 (spec-writer) paused its general review of STORY-009 partway through — you had found gaps (missing `topic`-immutability AC, missing update-capability AC for `context`/`status`/`participant_role`/links) but hadn't yet discussed or resolved them, because the user raised a product-direction question first. That question went to a product-strategist session (SESSION-018), which resolved: Project remains an unchanged, freely creatable/deletable CRUD entity; `Session.project_id` becomes **mandatory** (a session is never created outside a project context); `linked_story_id`/`linked_task_id` remain optional and additive, not a substitute for project scope; sessions must be retrievable per project in addition to existing cross-project queries. `docs/validated-business-idea/latest.md` (v2) already reflects this.

**Topics**: Finish reviewing `docs/stories/STORY-009-session-tracking/description.md`: incorporate the mandatory `project_id` (and per-project retrieval) from SESSION-018's decision, and resolve your own previously-flagged gaps (topic immutability, update-capability AC for `context`/`status`/`participant_role`/links). Bring the spec to a state ready for architecture handoff.

---

## Report

**Decisions made**:
- STORY-009 (Session Tracking) spec finished: `project_id` added as a required create field; `topic` declared immutable after create; `context`/`status`/`participant_role`/`linked_story_id`/`linked_task_id` declared independently updatable (omit = unchanged, explicit `null` = clear); new edge cases added for missing/nonexistent `project_id`, cross-project link mismatches, and project-delete cascade of its sessions.
- **Scope narrowed further, direct user decision (post-initial close)**: cross-project session queries are **removed** — sessions are listed and queried for "incomplete" strictly scoped to one active project, the same way Task Manager scopes Stories/Tasks. This reverses part of SESSION-018/validated-business-idea v2 ("in addition to cross-project queries"); the user explicitly chose to decide this directly with spec-writer rather than reopening a product-strategist session. Flagged inline in `description.md` that `validated-business-idea/latest.md` (product-strategist-owned) has not been updated to match and should be reconciled there.
- **UI Behavior section added** to STORY-009 (previously the story had no UI-facing content at all): Sessions list scoped to the active project, a create form with implicit `project_id`, and — the main gap the user flagged — a dedicated **Session Detail view** (topic read-only, other fields editable, archive action, clickable linked story/task). Noted that this supersedes the pre-existing, now-stale "Sessions View" forward-spec in `requirements/requirements_web.md` (predates project-scoping; no detail view), to be reconciled into that document once built.
- `docs/validated-business-idea/changelog.md` v2 entry marked processed: `**Stories:** —` → `**Stories:** STORY-009`.
- New interim story created at the user's request: **STORY-022 — Global Project Navigation Entry** (P1, feature, `Planned`). Moves the "manage projects" navigation entry from the Task Manager-only sidebar link to a persistent, mode-independent entry in the top bar near Settings — directly implementing SESSION-018's "reachable independent of any single module's view" decision. Added to `docs/stories/index.md`.

**Open questions**:
- `docs/validated-business-idea/latest.md` (v2) and `docs/requirements/requirements_backend.md`'s forward-spec Session section are both now stale relative to STORY-009's final spec (cross-project query mention in the former; "Sessions do not belong to a project" in the latter). Both are outside spec-writer's edit scope right now (product-strategist-owned / requirements.md is Reconcile-only) — flagged in-file, not fixed.
- STORY-022's exact top-bar visual placement/mechanism, and STORY-009's exact navigation placement for the Sessions views (e.g. project sub-nav tab vs. other mechanism), are both left to architecture/frontend design.

**Summary**: Completed the STORY-009 review left open by SESSION-017 — incorporated SESSION-018's mandatory-`project_id` decision and spec-writer's own previously-flagged gaps (topic immutability, updatable fields), then, at the user's request post-close, further narrowed scope to remove cross-project session queries entirely and added a full UI Behavior section (list, create, and a new dedicated Session Detail view). Also created STORY-022, an interim navigation story relocating project management to a global nav entry. STORY-009 is now ready for architecture handoff. Session closed at the user's request.

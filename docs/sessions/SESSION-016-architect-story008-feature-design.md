---
session: SESSION-016
agent: architect
status: completed
---

## Briefing
**Goal**: Feature Design for STORY-008 (Work Item Comments) — produce the technical design and implementation plan.

**Context**: Orchestrator's dashboard check found no stories pending approval or reconcile. STORY-008 had a face-to-face review with spec-writer in SESSION-015, which substantially expanded its `description.md` (see `docs/stories/STORY-008-comments/description.md` and the SESSION-015 Report section for the full account of decisions and open items). Story status remains `Planned`. The user now wants Feature Design for STORY-008 specifically.

**Topics**: Design the technical approach and produce `implementation_plan.md` + task files for STORY-008, per the current `description.md`.

---

## Report

**Decisions made**:
- **Comments domain** mirrors `attachments`: polymorphic FK-less container (story/task/milestone),
  migration `0011`, `CommentReader` Protocol for detail composition + cascade delete on all three
  hosts. UUID ids (app-wide consistency).
- **Replies use a persisted, immutable materialized ancestor path (`ancestors`), NOT the spec's
  schema-free prepend-to-content model.** The user directed this, on the principle that the
  spec-writer should not impose an implementation approach — the architect owns the "how". Create
  input stays a single optional `in_reply_to`; the server validates (exists + same-container) and
  derives `ancestors = parent.ancestors + [parent.id]`; `content` is stored verbatim. Recorded as a
  Spec Divergence in the implementation plan (four description ACs prescribing the old mechanism now
  diverge) — **spec-writer should strip the implementation prescription from `description.md`,
  keeping the behavior.**
- **Bidirectional traversal, both first-class:** up = `GET /comments/{id}/ancestors` (+ MCP
  `get_comment_ancestors`), powered by a `list_by_ids` repo helper (single `id IN (…)` query); down =
  `descendant_of` list filter (ancestors-contains, via the existing JSON-array helper).
- **List `after_id` watermark** for incremental agent polling — keyset on `(created_at, id)`; a
  deleted-watermark id returns 404 (documented gotcha). Anchored "N around X" window deferred to a
  future, non-breaking extension (user's call).
- **`default_web_ui_role`** — a scalar setting added to the existing settings store (reusing the
  `(key, values)` row + override machinery), validated against effective `participant_roles`;
  consumed only by the Web UI to pre-fill a comment's mandatory, immutable `author_role`.
- **`operator` seed** added to system `participant_roles` + system `default_web_ui_role="operator"`.
  DB confirmed **pre-production**, so the `0002_settings` seed is edited in place and re-run as a
  clean install (no backfill migration).
- **`@role` mentions**: the app's first non-native dropdown — an accessible (ARIA/WCAG 2.1 AA)
  autocomplete over `participant_roles`; pure text, render-time highlight only.

**Open questions**:
- `description.md` needs a spec-writer pass to remove the reply-mechanism implementation
  prescription (persist-vs-prepend, "no field stored", editable-link-in-textarea) while preserving
  behavior. Flagged as Spec Divergences in the plan; recommend running it before or at Reconcile.

**Summary**: Feature Design for STORY-008 complete. Produced `implementation_plan.md` (context,
technical approach, proposed API surface with per-endpoint parameters, spec divergences, 11 ordered
tasks, planned ADRs, constraints) and 11 task files + `tasks/index.md` (5 backend / 4 frontend /
1 qa-automation), in a valid dependency DAG. Story remains `Planned`. Three Planned ADRs recorded
(scalar setting; persisted materialized ancestor path over the spec's schema-free model; `operator`
role) — ADR files created at Reconcile. Architect memory updated with two learnings (DB is
pre-production → migrations may be edited in place; spec defines behavior, architect owns the
implementation approach).

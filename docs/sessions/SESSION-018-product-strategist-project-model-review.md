---
session: SESSION-018
agent: product-strategist
status: completed
---

## Briefing
**Goal**: Validate whether the current Project model is the right direction for this utility, and how Sessions (STORY-009) should relate to a project.

**Context**: During a face-to-face spec-writer session (SESSION-017) reviewing STORY-009 (Session Tracking), the user raised a product-direction question before the spec review could finish: should a Session always be scoped to a project? That surfaced a broader reflection the user wants to validate directly with product-strategist: is managing Projects as a freely creatable/deletable CRUD entity inside this task-tracking utility the right call, or should project identity instead come from some more global/external registry? This is "thinking out loud" territory the user explicitly wants to work through before STORY-009's spec is finalized — no direction has been decided yet.

**Topics**: Work through whether Projects should remain a first-class, freely creatable/deletable entity in this tool, or whether project identity should be sourced differently. As part of that, resolve how Sessions should relate to a project — a required `project_id`, an inference from `linked_story_id`/`linked_task_id`, or something else — so spec-writer can finish STORY-009 afterward.

---

## Report

**Decisions made**:
- Project remains a freely creatable/deletable, first-class CRUD entity — the data model and API are **unchanged and reconfirmed**. The reflection was never about Project's identity mechanism; it was about which module conceptually "owns" it.
- Project is confirmed as the **universal top-level anchor for every module** in the utility (Tasks and Sessions today; any future module — e.g. a test-case tracking module — tomorrow), not a construct nested inside or owned by the Task Manager module. Project management (and connecting other modules to a project) must be reachable independent of any single module's view — the concrete UI/navigation mechanism is left to architecture/frontend design, not specified here.
- Session gains a **mandatory** `project_id` — a session is never created outside a project context. `linked_story_id` / `linked_task_id` remain **optional and additive**, not a substitute for project scope.
- Sessions must be retrievable per project (in addition to existing cross-project queries), to support agents/orchestrator reviewing project-specific session history.

**Open questions**:
- Concrete UI/navigation mechanism for reaching Project management independent of Task Manager — deferred to architecture/frontend-developer.
- STORY-009's own spec gaps flagged in SESSION-017 (topic-immutability AC, missing update-capability AC for `context`/`status`/`participant_role`/links) are still unresolved — not addressed in this session, remain spec-writer's task.
- Whether a dedicated "test run"/test-case entity gets built at all remains unconfirmed (unchanged open item, now explicitly linked to the same project-anchoring pattern).

**Summary**: Session opened to resolve a product-direction question raised during a STORY-009 spec review (SESSION-017): whether Project should remain a freely creatable/deletable CRUD entity, and how Sessions should relate to a project. Through discussion, the user clarified the actual concern was architectural placement (Project management should be reachable from a global entry point, not nested inside Task Manager), not the data model itself. Resolved: Project entity unchanged; Session.project_id becomes mandatory with linked_story_id/linked_task_id remaining optional; sessions queryable per project. Updated `docs/validated-business-idea/latest.md` (v2) accordingly — Sessions Module scope, Core Value Proposition, and the Out-of-Scope test-run note — archived the prior version to `validated-idea-v1.md`, and logged the change in `changelog.md`. Handoff: spec-writer should incorporate the mandatory `project_id` into STORY-009's spec (along with its own previously-flagged gaps) before the story moves to architecture.

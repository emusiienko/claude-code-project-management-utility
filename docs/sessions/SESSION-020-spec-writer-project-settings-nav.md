---
session: SESSION-020
agent: spec-writer
status: completed
---

## Briefing
**Goal**: Work through a scope change to STORY-022 (Global Project Navigation Entry) — whether project management and project settings should merge into a single view.

**Context**: STORY-022 already has an approved implementation plan and two task files (TASK-001 frontend-developer, TASK-002 qa-automation) from an architect Feature Design session, relocating the existing "Manage Projects" link to a global top-bar entry pointing at the existing Projects management page (`/projects`). Before implementation started, the user had a new thought: instead of clicking a project to navigate to its stories, clicking a project could open its settings in the same view — combining project management and project settings into one place.

**Topics**: Work through this idea with the user — clarify what "open project settings when clicking on project" should mean concretely (replacing today's navigation to the project's stories view, or something additive), and decide whether it amends STORY-022's scope directly or becomes a separate story. Update or create story descriptions as needed.

---

## Report

**Decisions made**:
- The idea is confirmed as: clicking a project's name in the Projects Management page (`/projects`) now navigates to that project's Settings view (`/projects/:id/settings`) instead of its Stories view (`/projects/:id/stories`) — a landing-destination swap, not a merged/combined UI.
- Scope is amended directly into STORY-022 (not split into a separate story), even though the two changes are logically independent. The user explicitly chose this over a separate story, accepting that STORY-022's already-approved implementation plan (TASK-001, TASK-002) will need architect re-review.
- Scope is confirmed narrow: only the project-name click target on the `/projects` management page changes. The Task Manager sidebar's project combobox/list (which also navigate to a project) are explicitly unaffected and continue to land on Stories.
- No functionality is removed — Stories/Board/Milestones remain reachable via the existing project sub-navigation tabs once inside a project.

**Open questions**: None outstanding. The user accepted the updated `docs/stories/STORY-022-global-project-navigation/description.md` as-is.

**Summary**: Updated STORY-022's Desired Outcome, Context, Acceptance Criteria (+3), and Edge Cases (+1) to fold in the new "click project → Settings" navigation behavior alongside the original global top-bar Projects entry work. Added an explicit note flagging to the architect that the previously-approved implementation plan needs to be revisited before implementation resumes. `docs/requirements.md` was intentionally not touched (updated only at Reconcile, per spec-writer scope). Story status remains `Planned`.

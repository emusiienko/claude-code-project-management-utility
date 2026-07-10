---
session: SESSION-011
agent: spec-writer
status: completed
---

## Briefing

**Goal**: Review and finalise the requirements for STORY-012 (Milestones), adding the board view milestone-filter behaviour that was explicitly deferred from STORY-016.

**Context**: STORY-012 already has a draft `description.md` at `docs/stories/STORY-012-milestones/description.md`. STORY-016 (Navigation & UX Redesign) introduced the Board view showing all project stories as a kanban; the milestone-based filtering and the milestone sub-nav tab enabling/disabling were explicitly deferred to this story. The user now wants to fold that behaviour into STORY-012 scope.

Key user inputs:
- Milestone CRUD and story assignment (already partially drafted in STORY-012)
- Board view should filter by the project's *active* milestone — the user said "it filters by active milestones"
- This implies a concept of "active" milestone per project that needs to be defined

**Topics**:
- Review the current STORY-012 acceptance criteria together with the user — confirm what is correct and what should change
- Define "active milestone": what makes a milestone active? Is it a flag on the milestone? A per-project setting? Can a project have more than one active milestone?
- Define the Board filtering behaviour: how does the filter interact with the existing board (all stories shown when no milestone is active, filtered when one is active, user can toggle, etc.)
- Define the Milestones sub-nav tab behaviour: when is it enabled/accessible? Does the tab activate automatically when a milestone is set as active?
- Check if `milestone_id` on Story (nullable FK) is still the right model, or if an explicit project↔milestone "active" link is needed
- Produce a revised `docs/stories/STORY-012-milestones/description.md` with complete acceptance criteria and edge cases

---

## Report

**Decisions made**:
- A milestone belongs to exactly **one project** (not multi-project); cross-project milestones are handled by duplicating
- Milestone lifecycle: three statuses — `Planned` (default), `Active`, `Finished`; at most one `Active` per project at a time
- Activating a milestone when another is `Active` triggers a confirmation dialog; the previous one reverts to `Planned`
- Board view: when a project has an `Active` milestone, Board loads filtered to that milestone's stories by default; user can toggle to show all; toggle resets on navigation
- Board tab: always enabled regardless of milestone state; no active milestone = all stories shown, no filter indicator
- Milestones sub-nav tab: always visible; empty state shown when no milestones exist
- Attachments and Comments on milestones: **out of STORY-012 scope**; deferred to STORY-007 and STORY-008 (both updated to include milestones in their scope)

**Open questions**: none

**Summary**: `docs/stories/STORY-012-milestones/description.md` fully revised with the 3-state status model, Board filtering behavior, and Milestones sub-nav tab. `requirements_web.md` updated (Milestones View, Milestone Detail, validation table). `requirements_backend.md` Feature List updated. `STORY-007` and `STORY-008` updated to include milestones as a supported entity for when they are eventually implemented.

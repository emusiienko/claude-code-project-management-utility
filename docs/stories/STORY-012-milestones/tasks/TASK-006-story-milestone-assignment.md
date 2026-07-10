---
status: Done
assignee: frontend-developer
story: STORY-012
---

# TASK-006: Story milestone-assignment control (slide-over)

## What to implement

Add an inline milestone-assignment control to the Story Detail slide-over.

- Show the story's current milestone assignment (name, or "none").
- Offer an inline control to set the milestone or clear it (set to null), populated only with
  milestones belonging to the story's project.
- Setting or clearing uses the existing story-update path (`milestone_id`) and does not alter any
  other story field.
- Reflect the updated assignment immediately after the change.

## Scope

Frontend Story Detail slide-over — the inline milestone set/clear control. Consumes the milestone
list (scoped to the story's project) and the existing story-update path.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] The story's current milestone assignment is visible in the slide-over
- [ ] The control lists only milestones belonging to the story's project
- [ ] Assigning or clearing the milestone updates only `milestone_id` and reflects immediately

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-10

**What was done**:
Added an inline milestone assignment control to the Story Detail slide-over right panel.
The control displays a native `<select>` populated with all milestones belonging to the
story's project. Selecting an option (or "None") immediately calls the parent's
`handleMilestoneAssign` handler which fires `PUT /stories/:id` with only `milestone_id` set.
The current assignment is reflected in real time via TanStack Query cache invalidation.

Key files created or modified:
- Created `src/api/endpoints/milestones.ts` — full CRUD + lifecycle endpoint functions for
  the Milestones domain (listMilestones, createMilestone, getMilestone, updateMilestone,
  deleteMilestone, activateMilestone, finishMilestone).
- Created `src/features/milestones/hooks/useMilestones.ts` — TanStack Query hooks for
  milestones: useProjectMilestones, useMilestone, useCreateMilestone, useUpdateMilestone,
  useDeleteMilestone, useActivateMilestone, useFinishMilestone.
- Created `src/features/stories/components/MilestoneAssignment.tsx` — self-contained inline
  assignment control; fetches the project's milestone list via useProjectMilestones; renders
  a native select with "None" + milestone options; delegates mutation to parent via onAssign.
- Modified `src/features/stories/components/StoryRightPanel.tsx` — added Milestone section
  between Description and Attachments; added onMilestoneAssign and isMilestoneUpdatePending props.
- Modified `src/features/stories/components/StorySlideOver.tsx` — added handleMilestoneAssign
  function (calls updateMutation with milestone_id only); passes it to StoryRightPanel.
- Updated `src/api/types.ts` — added MilestoneStatus type alias; updated Milestone interface
  to v1.2 shape (project_id, status, story_count optional); CreateMilestone and UpdateMilestone
  were already updated by a prior session.

**Deviations from plan**:
Several foundational files (api/paths.ts milestones section, api/endpoints/milestones.ts,
config/apiConfig.ts MILESTONES entries, api/types.ts v1.2 Milestone shape, milestones feature
folder structure with hooks/ and components/ subdirectories) were already present from prior
TASK-003/TASK-004/TASK-005 in-progress work. Only useMilestones.ts hook and the actual
MilestoneAssignment control were net-new.

**Technical decisions made**:
- MilestoneAssignment is a self-contained component for data-fetching (query only); the actual
  story update mutation remains in StorySlideOver to keep the error boundary in one place and
  avoid duplicating mutation state.
- Native `<select>` used instead of a custom dropdown — keeps the panel lightweight and
  keyboard-accessible without adding a new component primitive.
- Status hint below the select shows the active milestone's status in brand color (Active) or
  muted (Planned/Finished) — helps the user identify the project's active milestone at a glance.
- Milestone options show `(Active)` or `(Finished)` suffixes so users can distinguish milestones
  without reading the hint. Planned milestones have no suffix (default/expected state).

**Code locations**:
- `frontend/src/api/endpoints/milestones.ts`
- `frontend/src/features/milestones/hooks/useMilestones.ts`
- `frontend/src/features/stories/components/MilestoneAssignment.tsx`
- `frontend/src/features/stories/components/StoryRightPanel.tsx`
- `frontend/src/features/stories/components/StorySlideOver.tsx`
- `frontend/src/api/types.ts` (MilestoneStatus type + Milestone interface)

**Technical debt noted**:
- The milestone assignment error from a failed PUT is surfaced via the existing
  `mutationError` banner in StorySlideOver, which is shared with the Edit modal path.
  A future story (STORY-013+) may want per-field inline error display once the banner
  pattern is revisited.

---
status: Done
assignee: frontend-developer
story: STORY-012
---

# TASK-007: Story-form milestone field

## What to implement

Add an optional milestone selector to the story create/edit form.

- The selector lists only milestones belonging to the story's project, plus a "none" option.
- On create, the chosen milestone (if any) is sent as the story's `milestone_id`; leaving it unset
  creates a story with no milestone.
- On edit, the selector reflects the current assignment and can change or clear it via the existing
  story-update path.

## Scope

Frontend Stories feature — the milestone field on the story form. Consumes the project-scoped
milestone list and the existing story create/update paths. This complements the slide-over control
(TASK-006) so assignment is possible both at creation and from the detail view.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] The story form shows an optional milestone selector listing only the project's milestones plus
      "none"
- [ ] Creating a story with a milestone selected assigns it; leaving it unset creates an unassigned
      story
- [ ] Editing reflects the current assignment and can change or clear it

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-10

**What was done**:
Added an optional milestone selector to the story create/edit form. The selector is populated from
milestones belonging to the story's project (via `useProjectMilestones`) and includes a "None"
option to create/edit a story without a milestone assignment. The field is shown whenever
`milestoneOptions` is provided as a prop; an empty array shows the field in a disabled state with a
"No milestones in this project yet." hint. Milestone status labels other than "planned" are
capitalised and appended in parentheses for context (e.g. "Sprint 1 (Active)").

Three files were modified:
- `StoryForm` — added `milestone_id: string | null` to `StoryFormValues`, added `milestoneOptions?:
  Milestone[]` prop, added the milestone `<select>` field between Status and Content.
- `StoryModal` — added `milestoneOptions?: Milestone[]` prop, passes it through to `StoryForm`,
  and seeds `initialValues.milestone_id` from `story.milestone_id` in edit mode.
- `StoriesPage` — added `useProjectMilestones(safeProjectId)` query, derives `milestoneOptions`,
  passes it to both the create and edit `StoryModal` instances, and wires `milestone_id` in both
  `handleCreateSubmit` (null → omit to avoid sending it on create) and `handleEditSubmit` (null →
  send null to explicitly clear the assignment).

Additionally updated `StorySlideOver` so its inline Edit modal also passes `milestoneOptions` and
sends `milestone_id` in the update payload — without this the slide-over edit path would silently
omit the milestone field.

**Deviations from plan**:
`StorySlideOver.tsx` was not mentioned in the task scope but was updated for consistency: the
slide-over's Edit modal uses `StoryModal` and needed `milestoneOptions` and the `milestone_id`
field in its `handleEditSubmit` handler to avoid losing milestone assignments when editing from
the slide-over.

**Technical decisions made**:
- `milestoneOptions` is `undefined` (hide field) vs `[]` (show disabled with hint) vs populated
  array (show active selector). This allows `StoriesPage` to always pass the array (empty until
  milestones load) without flickering.
- On create, `milestone_id: null` is coerced to `undefined` in the payload so the field is not
  sent when no milestone is selected (keeps the API payload minimal; null means "clear" on update).
- On update, `milestone_id: null` is sent as-is to explicitly clear the assignment.
- `capitalizeStatus` is defined locally in `StoryForm`; the identical helper in
  `MilestoneAssignment.tsx` (TASK-006) is not shared — both are small pure functions and
  `MilestoneAssignment` is not importable from `StoryForm` without crossing feature boundaries.

**Code locations**:
- `frontend/src/features/stories/components/StoryForm.tsx` — milestone field added
- `frontend/src/features/stories/components/StoryModal.tsx` — milestoneOptions prop + initialValues
- `frontend/src/features/stories/StoriesPage.tsx` — milestone query + wired to modals
- `frontend/src/features/stories/components/StorySlideOver.tsx` — milestone query + edit modal wired

**Technical debt noted**:
None.

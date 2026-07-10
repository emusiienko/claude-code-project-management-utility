---
status: Planned
type: feature
priority: P1
date: 2026-06-29
---

# STORY-012: Milestones

## Desired Outcome
Stories can be optionally assigned to a named milestone — a lightweight planning marker scoped to a single project. A milestone has a lifecycle status (`Planned` → `Active` → `Finished`); when `Active`, it becomes the default filter for that project's Board view, surfacing only its assigned stories. Its use is entirely optional: the utility works without milestones and stories can exist with no milestone assigned.

## Context
A milestone belongs to exactly one project; only stories from that project may be assigned to it. The relationship between a story and a milestone is an optional assignment (nullable FK on Story) — not ownership. Deleting a milestone never deletes the stories assigned to it; their milestone link is set to null. Milestone names are unique within a project.

Each milestone has one of three statuses: `Planned`, `Active`, or `Finished`. A project can have at most one `Active` milestone at a time. Activating a new milestone for a project automatically sets the previously active milestone back to `Planned`.

## Acceptance Criteria

### Milestone CRUD
- [ ] A milestone can be created with a required name, a required project, and an optional description
- [ ] All milestones can be listed with pagination; results can be filtered by project
- [ ] A milestone's name and description can be updated
- [ ] A milestone can be deleted; all stories previously assigned to it have their milestone link set to null — no story is deleted

### Story Assignment
- [ ] A story can be assigned to a milestone by setting its `milestone_id`; only milestones belonging to that story's project are eligible for selection
- [ ] A story's milestone assignment can be cleared (set to null) without changing any other story field
- [ ] All stories assigned to a given milestone can be listed with pagination

### Milestone Status
- [ ] A milestone can be created with status `Planned` (default); the user can activate it (→ `Active`) or mark it as finished (→ `Finished`) from the project's Milestones tab
- [ ] Only one milestone per project may have status `Active` at a time; activating a milestone when another is already `Active` shows a confirmation dialog naming the currently active milestone, and on confirm sets the previous one back to `Planned`
- [ ] An `Active` milestone can be set to `Finished`; when this happens the Board reverts to showing all stories unfiltered
- [ ] A `Finished` milestone can be re-activated (→ `Active`), following the same confirmation flow as above
- [ ] The `Active` milestone row is visually distinguished in the project's Milestones tab list

### Board View
- [ ] When a project has an active milestone, the Board view loads showing only stories assigned to that milestone; the active filter is indicated by a visible label (milestone name) with a toggle to show all stories
- [ ] When the user activates the "show all" toggle, the Board displays all stories regardless of milestone assignment; the toggle persists until the user navigates away from the Board
- [ ] When no active milestone is set for a project, the Board shows all stories without any filter applied and no filter indicator is visible
- [ ] When the Board's filtered view contains zero stories (no stories in the project are assigned to the active milestone), an empty state is shown with a prompt to assign stories or toggle to all stories

### Milestones Sub-nav Tab
- [ ] The Milestones tab is always present in the project sub-navigation, regardless of whether any milestones exist for the project
- [ ] When no milestones exist for the project, the Milestones tab shows an empty state with an invitation to create one
- [ ] The project's Milestones tab lists all milestones for that project, showing for each: name, status badge (`Planned` / `Active` / `Finished`), story count, description (truncated)

### Story View
- [ ] When viewing a story, its current milestone assignment is visible; it can be set or cleared via an inline control populated from milestones belonging to that story's project

## Edge Cases & Error Scenarios
- [ ] Creating a milestone whose name already exists within the same project returns a conflict error: "A milestone named '{name}' already exists in this project."
- [ ] Assigning a story to a milestone that belongs to a different project is rejected: "This milestone does not belong to the story's project."
- [ ] Assigning a story to a non-existent milestone returns 404
- [ ] A milestone with no stories assigned is valid
- [ ] Deleting a project deletes all its milestones; stories that had milestone assignments lose their `milestone_id` (set to null)
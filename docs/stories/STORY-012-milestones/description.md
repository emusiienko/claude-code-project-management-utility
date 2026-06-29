---
status: Planned
type: feature
priority: P1
date: 2026-06-29
---

# STORY-012: Milestones

## Desired Outcome
Stories can be optionally assigned to a named milestone — a lightweight planning marker that spans one or more projects. A milestone has its own description, attachments (e.g. architecture plans, implementation guides), and comments, providing a shared space for information that cuts across multiple stories. Its use is entirely optional: the utility works without milestones and stories can exist with no milestone assigned.

## Context
A milestone is associated with one or more projects at creation time; only stories from those projects may be linked to it. This allows a milestone like "Q3 Release" to span a backend project and a frontend project simultaneously. The relationship between a story and a milestone is an optional assignment (nullable FK on Story) — not ownership. Deleting a milestone never deletes the stories assigned to it. Milestone names are unique within each associated project: two different milestones can share a name only if they do not share any project.

## Acceptance Criteria
- [ ] A milestone can be created with a required name, one or more associated projects, and an optional description
- [ ] All milestones can be listed with pagination; results can be filtered by project — the filter returns only milestones whose associated projects include the selected project
- [ ] A milestone's name, description, and set of associated projects can be updated
- [ ] A milestone can be deleted; all stories previously assigned to it have their milestone link set to null — no story is deleted
- [ ] A story can be assigned to a milestone by setting its `milestone_id`; only stories belonging to one of the milestone's associated projects are eligible
- [ ] A story's milestone assignment can be cleared (set to null) without changing any other story field
- [ ] All stories assigned to a given milestone can be listed with pagination; each result includes its `project_id`
- [ ] A milestone's attachments and comments follow the same rules as story-level attachments and comments (see STORY-007 and STORY-008)
- [ ] The Projects page (`/`) contains two sections: **Projects** (existing list) and **Milestones** (list of all milestones showing name, associated projects, story count, and description); no extra top-level nav item is added
- [ ] The Milestones section has a project filter dropdown (populated from all existing projects); selecting a project narrows the list to milestones associated with that project; clearing the filter restores the full list
- [ ] Clicking a milestone from the Projects page navigates to `/milestones/:id` — the Milestone Detail view, which shows: name, description, associated projects, list of assigned stories (with project_id), attachments, and comments
- [ ] When viewing a story, its current milestone assignment is visible; it can be set or cleared via an inline control populated from milestones associated with that story's project

## Edge Cases & Error Scenarios
- [ ] Creating a milestone whose name already exists within any of its associated projects returns a conflict error: "A milestone named '{name}' already exists in project '{project}'."
- [ ] Assigning a story to a milestone whose associated projects do not include that story's project is rejected: "Story's project is not associated with this milestone."
- [ ] Assigning a story to a non-existent milestone returns 404
- [ ] A milestone can be created with a single project and later extended to include additional projects
- [ ] Removing a project from a milestone's project list while stories from that project are still assigned to the milestone is rejected until those assignments are cleared first
- [ ] A milestone with no stories assigned is valid and can hold attachments and comments independently
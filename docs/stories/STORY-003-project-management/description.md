---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-003: Project Management

## Desired Outcome
The orchestrator and agents can create and manage projects — the top-level namespaces that group all stories, tasks, and related work artifacts. Each project is independently named and can be described.

## Context
A project is the outermost container in the utility. Every story, task, attachment, and comment belongs to a project. The project is always the first entity created before any work recording can begin. Project names must be unique across the whole utility so agents can reliably identify a project by name.

## Acceptance Criteria
- [ ] A project can be created with a required unique name (1–200 chars) and an optional description
- [ ] All existing projects can be listed with pagination
- [ ] A project's name and description can be updated
- [ ] A project can be deleted; all its stories, tasks, attachments, comments, and settings overrides are permanently removed
- [ ] A single project can be retrieved by its ID

## Edge Cases & Error Scenarios
- [ ] Creating a project with a name that already exists returns a conflict error: "A project with this name already exists."
- [ ] Deleting a project with active stories removes all nested data in a single operation — no partial state remains
- [ ] Listing projects on an empty system returns an empty list, not an error
- [ ] Updating a project name to a name already used by another project is rejected with a conflict error

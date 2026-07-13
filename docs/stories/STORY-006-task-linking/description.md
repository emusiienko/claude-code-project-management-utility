---
status: Accepted
type: feature
priority: P1
date: 2026-06-28
---

# STORY-006: Work Item Linking

## Desired Outcome
Tasks and stories can be connected with typed directed relationships — for example "depends on" or "provides context for". The utility records these links as facts and makes them visible; it does not enforce them as blocking rules or affect work item availability. Both surfaces — Task Detail Modal and Story slide-over — show linked items with their title as a clickable link that navigates to that item.

## Context
Links allow agents and the orchestrator to express semantic relationships between work items in the same project. Direction matters: "A depends on B" is distinct from "B depends on A". Link types come from the project's effective `link_types` dictionary. The utility is deliberately passive — it stores and surfaces link data but never prevents a task or story from being worked on because of a link.

Two linking surfaces are delivered together because they share the same semantic model:

- **task_links** — directed typed links between two tasks in the same story
- **story_links** — directed typed links between two stories in the same project, using the same schema and validation rules as task_links

## Acceptance Criteria

### Task Links — Backend
- [ ] A typed directed link can be created between two tasks in the same story; the `link_type` must be in the project's effective `link_types` dictionary
- [ ] Links for a task can be listed (outbound, inbound, or both directions); each result includes the linked task's id, title, and current status
- [ ] A task link can be deleted by its own id
- [ ] Duplicate task links (same source task, same target task, same type) are rejected with a conflict error (409)
- [ ] `GET /tasks/:id/detail` returns the `links` array populated with all task links (outbound + inbound), each enriched with the linked task's id, title, and status

### Story Links — Backend
- [ ] A typed directed link can be created between two stories in the same project; the `link_type` must be in the project's effective `link_types` dictionary
- [ ] Links for a story can be listed (outbound, inbound, or both directions) via `GET /stories/:storyId/links`; each result includes the linked story's id, title, and current status
- [ ] A story link can be deleted via `DELETE /story-links/:id`
- [ ] Duplicate story links (same source story, same target story, same type) are rejected with a conflict error (409)
- [ ] `GET /stories/:id/detail` returns the `links` array populated with all story links (outbound + inbound), each enriched with the linked story's id, title, and status

### Task Links — UI (Task Detail Modal)
- [ ] The Links section in the Task Detail Modal shows all outbound and inbound links for the task; each row displays a direction indicator (→ / ←), the `link_type` badge, and the linked task's title
- [ ] The linked task title in each row is clickable and navigates to that task's Task Detail Modal (URL updates to `/projects/:id/stories/:storyId/tasks/:taskId`)
- [ ] The Add link form allows the user to search for a target task by title and select a `link_type` from a dropdown populated from the project's effective `link_types`
- [ ] A Delete button per link row opens a confirmation dialog; on confirm the link is removed and the list refreshes

### Story Links — UI (Story Slide-over)
- [ ] The Story slide-over right panel contains a Links section listing all outbound and inbound story links; each row displays a direction indicator (→ / ←), the `link_type` badge, and the linked story's title
- [ ] The linked story title in each row is clickable and opens that story's Story slide-over (URL updates to `/projects/:id/stories/:linkedStoryId`)
- [ ] The Add link form allows the user to search for a target story by title and select a `link_type` from the project's effective `link_types`
- [ ] A Delete button per link row opens a confirmation dialog; on confirm the link is removed and the list refreshes

## Edge Cases & Error Scenarios

### Task Links
- [ ] Attempting to link a task to itself is rejected: "A task cannot link to itself."
- [ ] Attempting to link tasks from different stories is rejected
- [ ] Using a `link_type` value not in the project's dictionary is rejected with a validation error (422)
- [ ] Deleting a task also deletes all its outbound and inbound task links — no orphaned task link records remain

### Story Links
- [ ] Attempting to link a story to itself is rejected: "A story cannot link to itself."
- [ ] Attempting to link stories from different projects is rejected
- [ ] Using a `link_type` value not in the project's dictionary is rejected with a validation error (422)
- [ ] Deleting a story also deletes all its outbound and inbound story links — no orphaned story link records remain

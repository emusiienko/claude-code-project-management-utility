---
status: ToDo
assignee: frontend-developer
story: STORY-006
---

# TASK-005: Task links UI in Task Detail Modal

## What to implement

Replace the "Links — coming in STORY-006" placeholder section in the Task Detail Modal with a live Links section, backed by the task-link hooks from TASK-004.

**Link list.** Show all outbound and inbound links for the task. Each row displays a direction indicator (→ for outbound, ← for inbound), the `link_type` as a badge, and the linked task's title. The linked task's title is a clickable link that navigates to that task's Task Detail Modal (the URL updates to the task-detail route for the linked task within the same story slide-over).

**Add-link form.** A control to create a new link: search for a target task by title (scoped to tasks in the same story, reusing the existing task-list query) and select a `link_type` from a dropdown. The `link_type` options come from the project's effective `link_types` dictionary, read from the settings-effective query already in cache on this surface — no extra network call. On submit, create the link and refresh the list.

**Delete.** A per-row delete button opens a confirmation dialog; on confirm, remove the link and refresh the list.

Surface field/validation and conflict errors (self-link, duplicate, invalid `link_type`) inline using the existing error-message extraction utilities.

## Scope

`frontend/src/features/tasks/` — the Links section within the Task Detail Modal and its subcomponents (list row, add-link form, delete confirmation).

## Dependencies

TASK-004.

## Acceptance Criteria

- [ ] The Links section lists all outbound and inbound links, each with a direction indicator, a `link_type` badge, and the linked task's title.
- [ ] Clicking a linked task's title navigates to that task's Task Detail Modal (URL updates to the linked task's detail route).
- [ ] The Add-link form searches target tasks by title (same story only) and offers a `link_type` dropdown populated from the effective `link_types` with no extra network call; submitting creates the link and refreshes the list.
- [ ] A per-row delete opens a confirmation dialog and removes the link on confirm, refreshing the list.
- [ ] Backend rejections (self-link, cross-story, invalid type, duplicate) are shown inline.

## Intended ADR

None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

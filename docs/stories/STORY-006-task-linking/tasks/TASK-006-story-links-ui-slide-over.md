---
status: ToDo
assignee: frontend-developer
story: STORY-006
---

# TASK-006: Story links UI in Story slide-over

## What to implement

Replace the "Links — coming in STORY-006" placeholder in the Story slide-over right panel with a live Links section, backed by the story-link hooks from TASK-004. Same shape as the task-links section (TASK-005), scoped to stories.

**Link list.** Show all outbound and inbound story links. Each row displays a direction indicator (→ for outbound, ← for inbound), the `link_type` as a badge, and the linked story's title. The linked story's title is a clickable link that opens that story's Story slide-over (the URL updates to the linked story's slide-over route within the same project).

**Add-link form.** Search for a target story by title (scoped to stories in the same project, reusing the existing story-list query) and select a `link_type` from a dropdown populated from the project's effective `link_types`, read from the settings-effective query already in cache on this surface — no extra network call. On submit, create the link and refresh the list.

**Delete.** A per-row delete button opens a confirmation dialog; on confirm, remove the link and refresh the list.

Surface backend rejections (self-link, cross-project, invalid `link_type`, duplicate) inline using the existing error-message utilities.

## Scope

`frontend/src/features/stories/` — the Links section within the Story slide-over right panel and its subcomponents (list row, add-link form, delete confirmation).

## Dependencies

TASK-004. May proceed in parallel with TASK-005.

## Acceptance Criteria

- [ ] The right-panel Links section lists all outbound and inbound story links, each with a direction indicator, a `link_type` badge, and the linked story's title.
- [ ] Clicking a linked story's title opens that story's Story slide-over (URL updates to the linked story's slide-over route).
- [ ] The Add-link form searches target stories by title (same project only) and offers a `link_type` dropdown populated from the effective `link_types` with no extra network call; submitting creates the link and refreshes the list.
- [ ] A per-row delete opens a confirmation dialog and removes the link on confirm, refreshing the list.
- [ ] Backend rejections (self-link, cross-project, invalid type, duplicate) are shown inline.

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

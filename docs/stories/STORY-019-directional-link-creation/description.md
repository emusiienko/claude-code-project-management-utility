---
status: Accepted
type: fix
priority: P2
date: 2026-07-13
---

# STORY-019: Directional link creation in Add Link forms

## Desired Outcome

The "Add link" dropdown in `TaskDetailModal` and `StorySlideOver` shows all directional
labels instead of raw dictionary keys. When the user picks an inbound label, the link is
created with source and target swapped so direction semantics are preserved in the backend.

## Context

STORY-018 added `getLinkLabel` for rendering existing link badges. However the creation
forms (`AddTaskLinkForm`, `AddStoryLinkForm`) still show raw link_type keys from the
effective dictionary (e.g. "depends-on"). Users cannot express direction when creating a
link — they only see the key, not whether it is outbound or inbound.

The backend API always creates a link as `POST /{tasks|stories}/:sourceId/links` with
`{ target_{task|story}_id, link_type }`. Direction is expressed by which item is the
source and which is the target. An inbound selection from the current item's perspective
means the other item is actually the source.

## Acceptance Criteria

- [ ] `getLinkOptions(linkTypes: string[])` utility exported from `src/shared/utils/linkLabels.ts`
- [ ] Returns `LinkOption[]` where each entry has `{ label, linkType, direction }`
- [ ] Each key in `linkTypes` produces two entries: one outbound, one inbound
- [ ] Unknown keys use the raw key as the label for both directions
- [ ] `AddTaskLinkForm` dropdown shows directional labels built from `getLinkOptions`
- [ ] On inbound selection: `onSubmit` is called with source = selectedTask, target = currentTask
- [ ] On outbound selection: `onSubmit` is called with source = currentTask (unchanged)
- [ ] `AddStoryLinkForm` dropdown shows directional labels built from `getLinkOptions`
- [ ] On inbound selection: `onCreate` is called with source = selectedStory, target = currentStory
- [ ] On outbound selection: `onCreate` is called with source = currentStory (unchanged)

## Edge Cases & Error Scenarios

- [ ] Empty `linkTypes` array: form shows "No link types configured" placeholder
- [ ] Unknown link_type key: directional labels fall back to the raw key string

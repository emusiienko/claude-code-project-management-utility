---
status: Done
assignee: frontend-developer
story: STORY-019
---

# TASK-001: Directional link creation — Add Link form options and swap logic

## What to implement

Extend `linkLabels.ts` with a `getLinkOptions` function that expands each link_type key
into two picker options (outbound + inbound). Update `AddTaskLinkForm` and
`AddStoryLinkForm` to use the new options, and apply source/target swap for inbound
selections in the parent sections.

## Scope

- `src/shared/utils/linkLabels.ts` — add `getLinkOptions` + `LinkOption` type
- `src/features/tasks/components/AddTaskLinkForm.tsx` — new dropdown; updated `onSubmit` signature
- `src/features/tasks/components/TaskLinksSection.tsx` — handle swapped source/target for inbound
- `src/features/story-links/components/AddStoryLinkForm.tsx` — new dropdown; updated `onCreate` signature
- `src/features/story-links/components/StoryLinksSection.tsx` — handle swapped source/target for inbound

## Dependencies

STORY-018 TASK-001 (getLinkLabel already done)

## Acceptance Criteria

- [ ] `getLinkOptions` returns two entries per link_type key
- [ ] `AddTaskLinkForm` renders directional labels in the dropdown
- [ ] Inbound task link: POST source = selectedTask, target = currentTask
- [ ] `AddStoryLinkForm` renders directional labels in the dropdown
- [ ] Inbound story link: POST source = selectedStory, target = currentStory
- [ ] All 176 pre-existing vitest tests continue to pass

## Intended ADR

None

---
## Implementation Report

**Date**: 2026-07-13

**What was done**:
Extended `src/shared/utils/linkLabels.ts` with a `getLinkOptions(linkTypes: string[])` function and a `LinkOption` interface. Each link_type key is expanded into two picker entries (outbound + inbound) using the existing `LINK_TYPE_LABELS` mapping; unknown keys fall back to the raw key string.

Updated `AddTaskLinkForm` to accept `LinkOption[]` instead of `string[]`, store the selected option by index (to recover both `linkType` and `direction`), and pass `{ target_task_id, link_type, direction }` to `onSubmit`. Updated `TaskLinksSection` to build `LinkOption[]` via `getLinkOptions`, pass them to the form, and swap source/target for inbound selections before calling the create mutation.

Applied the same changes to `AddStoryLinkForm` and `StoryLinksSection` for story links.

Extended `useCreateTaskLink` and `useCreateStoryLink` to accept an optional `sourceTaskId`/`sourceStoryId` in the mutation data. When provided (inbound direction), the endpoint is called with the other item as source and the current item as target. Cache invalidation always targets the currently-viewed item so the UI refreshes correctly regardless of direction.

**Deviations from plan**: Plan listed 5 files; also modified `useTaskLinks.ts` and `useStoryLinks.ts` to support dynamic source override without calling the endpoint directly from a component. This keeps the no-direct-API-calls convention intact.

**Technical decisions made**:
- Option index is used as the `<select>` value instead of a composite string to avoid any parsing ambiguity when link_type keys contain hyphens.
- The `LinkOption` type is exported from `linkLabels.ts` (shared utils) because it is now consumed by both feature-level form components and section components.
- `sourceTaskId`/`sourceStoryId` is spread-excluded from the payload before being passed to the endpoint function, so the API contract shape (`CreateTaskLink`/`CreateStoryLink`) is unchanged.

**Code locations**:
- `frontend/src/shared/utils/linkLabels.ts` — added `getLinkOptions`, `LinkOption`, exported `Direction`
- `frontend/src/features/tasks/components/AddTaskLinkForm.tsx` — directional dropdown + updated `onSubmit` signature
- `frontend/src/features/tasks/components/TaskLinksSection.tsx` — passes `getLinkOptions(...)`, swap logic
- `frontend/src/features/task-links/hooks/useTaskLinks.ts` — `useCreateTaskLink` accepts optional `sourceTaskId`
- `frontend/src/features/story-links/components/AddStoryLinkForm.tsx` — directional dropdown + updated `onCreate` signature
- `frontend/src/features/story-links/components/StoryLinksSection.tsx` — passes `expandedLinkOptions`, swap logic
- `frontend/src/features/story-links/hooks/useStoryLinks.ts` — `useCreateStoryLink` accepts optional `sourceStoryId`

**Technical debt noted**: The target story selector in `AddStoryLinkForm` uses `PAGINATION.STORIES` (50) as page size — projects with more than 50 stories will show an incomplete list (pre-existing debt from STORY-006, documented there).

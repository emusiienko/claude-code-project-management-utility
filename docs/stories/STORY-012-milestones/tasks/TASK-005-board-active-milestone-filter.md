---
status: Done
assignee: frontend-developer
story: STORY-012
---

# TASK-005: Board active-milestone filter

## What to implement

Wire the Board view at `/projects/:id/board` to the project's active milestone.

- Determine the project's active milestone by reading the project's milestone list and selecting the
  single milestone whose status is `active`.
- When an active milestone exists, the Board loads showing only stories assigned to it (filter the
  existing story fetch by `milestone_id`). Show a visible filter label with the active milestone's
  name and a toggle to show all stories.
- The "show all" toggle drops the milestone filter and shows every story regardless of assignment.
  The toggle state persists per project until the user navigates away from the Board.
- When no active milestone exists for the project, the Board shows all stories with no filter and no
  filter indicator.
- When the filtered view contains zero stories, show an empty state prompting the user to assign
  stories or toggle to show all.

## Scope

Frontend Board feature — active-milestone discovery, story-list filtering by `milestone_id`, the
filter label, the "show all" toggle (persisted per project), and the filtered empty state. Uses the
existing story list with the `milestone_id` query parameter added in TASK-002.

## Dependencies

TASK-002

## Acceptance Criteria

- [x] With an active milestone, the Board defaults to that milestone's stories, with a visible filter
      label (milestone name) and a "show all" toggle
- [x] "Show all" shows every project story; the toggle persists per project until navigation away
- [x] With no active milestone, the Board shows all stories with no filter indicator
- [x] A filtered view with zero stories shows an empty state prompting to assign stories or show all

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-10

**What was done**:
- Updated `Milestone` type in `src/api/types.ts` to v1.2 shape: `project_id` (single owner), `status: MilestoneStatus`, `story_count` (always present). Added `MilestoneStatus` named union type. Updated `CreateMilestone` and `UpdateMilestone` request types accordingly.
- Added Milestone path constants to `src/api/paths.ts`: `MILESTONES`, `MILESTONE(id)`, `MILESTONE_ACTIVATE(id)`, `MILESTONE_FINISH(id)`.
- Created `src/api/endpoints/milestones.ts` with all seven endpoint functions: `listMilestones`, `createMilestone`, `getMilestone`, `updateMilestone`, `deleteMilestone`, `activateMilestone`, `finishMilestone`.
- Added `PAGINATION.MILESTONES = 100` and `DATA_FRESHNESS.MILESTONES = 30 * 1000` in `src/config/apiConfig.ts`.
- Added `milestone_id` optional filter to `StoryFilters` in `src/api/endpoints/stories.ts`.
- Created `src/shared/hooks/useActiveMilestone.ts` — cross-feature hook that fetches the project's milestone list and returns the single `active` milestone (or null). Uses `CACHE_KEYS.milestones.list({ project_id, active: true })` to keep it distinct from the full-project list used by the Milestones tab.
- Created `src/features/board/hooks/useBoardMilestoneFilter.ts` — manages filter state: `activeMilestoneId` (null when dismissed), `activeMilestone` (for banner), `showingAll`, `handleShowAll`. Resets when `projectId` changes to honor "persists until navigation away" requirement.
- Updated `src/features/board/hooks/useBoardStories.ts` to accept optional `milestoneId` param; passes it to `listStories` as `milestone_id` filter; cache key includes `milestone_id` for clean TanStack Query separation.
- Created `src/features/board/components/BoardMilestoneFilter.tsx` — accessible filter banner with milestone name and "Show all stories" button.
- Updated `BoardPage.tsx` to integrate: milestone loading state, filter banner, filtered empty state, board cache key includes `milestone_id`.
- Updated `BoardPage.test.tsx` to mock the new `useBoardMilestoneFilter` hook; updated `StorySlideOver.test.tsx` to mock `useProjectMilestones` (needed because `MilestoneAssignment` was introduced in the working tree by TASK-006 and renders inside `StoryRightPanel`, causing a missing `QueryClientProvider` error).

**Deviations from plan**:
None. The implementation follows the plan exactly: `useActiveMilestone` as a shared hook, filter state in a dedicated board hook, in-memory toggle that resets on `projectId` change.

**Technical decisions made**:
- `useBoardMilestoneFilter` uses a React `useEffect` on `projectId` (not `useRef`) to reset `showingAll`. This is the simplest approach that satisfies "resets on navigation away" without storing anything in localStorage (which would persist across sessions and violate the "until navigation away" requirement).
- The active-milestone cache key includes `{ active: true }` so the Board's milestone fetch does not collide with the Milestones tab's full project list (`{ project_id }` only). Two separate queries, two separate cache entries.
- `BoardMilestoneFilter` uses `role="status"` + `aria-live="polite"` (not `role="alert"`) because the filter banner announces a state, not an error.
- The filtered empty state renders the filter banner above the empty message so the user can see the active milestone name even when no stories match.
- `StorySlideOver.test.tsx` needed `useProjectMilestones` mocked because the test does not provide a `QueryClientProvider`. This mock was added to fix a pre-existing gap exposed by the TASK-006 working-tree changes, not by TASK-005 changes.

**Code locations**:
- `frontend/src/api/types.ts` — `Milestone`, `MilestoneStatus`, `CreateMilestone`, `UpdateMilestone` updated
- `frontend/src/api/paths.ts` — Milestone path constants added
- `frontend/src/api/endpoints/milestones.ts` — new file (all seven endpoint functions)
- `frontend/src/api/endpoints/stories.ts` — `milestone_id` added to `StoryFilters`
- `frontend/src/config/apiConfig.ts` — `PAGINATION.MILESTONES`, `DATA_FRESHNESS.MILESTONES` added
- `frontend/src/shared/hooks/useActiveMilestone.ts` — new file
- `frontend/src/features/board/hooks/useBoardMilestoneFilter.ts` — new file
- `frontend/src/features/board/hooks/useBoardStories.ts` — `milestoneId` param added
- `frontend/src/features/board/components/BoardMilestoneFilter.tsx` — new file
- `frontend/src/features/board/BoardPage.tsx` — integrated milestone filter
- `frontend/src/features/board/BoardPage.test.tsx` — `useBoardMilestoneFilter` mock added
- `frontend/src/features/stories/components/StorySlideOver.test.tsx` — `useProjectMilestones` mock added

**Technical debt noted**:
None.

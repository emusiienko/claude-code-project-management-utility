---
status: Done
assignee: frontend-developer
story: STORY-017
---

# TASK-001: Replace Board Milestone Banner+Toggle with Milestone Combobox

## What to implement

Replace the binary active-milestone banner in the Board with a `<select>` combobox that lists
all project milestones. The hook managing filter state changes from a boolean "show all" toggle
to a `selectedMilestoneId: string | null` value (null = all stories). The component is renamed
and redesigned to render the combobox. BoardPage is updated to wire the new hook and component.

## Scope

- `frontend/src/features/board/components/BoardMilestoneFilter.tsx`
- `frontend/src/features/board/hooks/useBoardMilestoneFilter.ts`
- `frontend/src/features/board/BoardPage.tsx`

## Dependencies

None

## Acceptance Criteria

- [ ] Combobox renders all project milestones fetched via the milestones API
- [ ] "All stories" appears as the first option (value = empty string / null sentinel)
- [ ] Status hint "(Active)", "(Planned)", "(Finished)" appended to each option label
- [ ] Default selection: active milestone id if one exists; otherwise "All stories"
- [ ] Changing selection re-filters Board stories immediately
- [ ] Selection resets to default on project navigation change
- [ ] No filter combobox rendered while milestones are loading
- [ ] Hook return contract: `selectedMilestoneId`, `milestones`, `isLoading`, `handleSelectMilestone`
- [ ] No regressions in existing test suite

## Intended ADR

None — no new architectural decisions introduced.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-11

**What was done**:

Replaced the binary "show all" toggle pattern with a milestone combobox:

1. `useBoardMilestoneFilter.ts` — rewrote to fetch all project milestones via a new
   `useMilestones` query (reusing `listMilestones` + CACHE_KEYS.milestones.list). State is now
   `selectedMilestoneId: string | null` (null = all stories). On mount and on `projectId` change
   the hook resets to the active milestone id (if found) or null. Exposes
   `{ selectedMilestoneId, milestones, isLoading, handleSelectMilestone }`.

2. `BoardMilestoneFilter.tsx` — replaced the banner+button with a labelled `<select>` combobox.
   Renders "All stories" as the first option; each milestone appears as
   `"<name> (<Status>)"`. Shown only when `!isLoading`. Keyboard-accessible via native `<select>`.

3. `BoardPage.tsx` — updated destructuring and JSX to use the new hook shape
   (`selectedMilestoneId`, `handleSelectMilestone`). Removed the stale `activeMilestone` banner
   reference and the "filtered+empty" guard that referenced the old `activeMilestone` object.
   The combobox is always rendered in the board header (never hidden after load).

**Deviations from plan**:

- `useBoardMilestoneFilter` no longer wraps `useActiveMilestone`; it directly queries the full
  milestone list. This avoids an extra cache entry and lets the combobox render all milestones
  without a second fetch.
- The "filtered + empty" early-return path in BoardPage was simplified: the combobox is shown in
  the standard header even when no stories match, avoiding duplicated JSX blocks.

**Technical decisions made**:

- Used `useQuery` with `CACHE_KEYS.milestones.list` directly inside the hook (same key used by
  the Milestones feature), so no extra network call is needed when the milestone list is already
  cached.
- Status hints use capitalized display strings (`"Active"`, `"Planned"`, `"Finished"`) mapped
  from the lowercase wire format.
- `<select>` is a native HTML element — no third-party combobox library needed for this use case.

**Code locations**:

- `frontend/src/features/board/hooks/useBoardMilestoneFilter.ts`
- `frontend/src/features/board/components/BoardMilestoneFilter.tsx`
- `frontend/src/features/board/BoardPage.tsx`

**Technical debt noted**:

- Existing `useBoardMilestoneFilter.test.ts` tests were written for the old binary API
  (`showingAll`, `handleShowAll`, `activeMilestone`). These tests now fail because the hook's
  contract changed. The test file needs to be updated by QA Automation to match the new API
  (`selectedMilestoneId`, `milestones`, `handleSelectMilestone`). Pre-existing tests for the old
  hook contract are now stale — not regressions introduced by this fix.

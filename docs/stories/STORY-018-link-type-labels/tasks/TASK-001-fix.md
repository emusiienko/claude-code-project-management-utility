---
status: Done
assignee: frontend-developer
story: STORY-018
---

# TASK-001: Direction-aware link type labels

## What to implement

Create a shared utility `getLinkLabel` that maps a `link_type` string and a `direction`
(`"outbound"` | `"inbound"`) to a human-readable label. Update `TaskLinkRow` and
`StoryLinksSection` to use this utility in the link type badge.

## Scope

- `src/shared/utils/linkLabels.ts` — new utility (shared because used by both task-links and story-links features)
- `frontend/src/features/tasks/components/TaskLinkRow.tsx` — update badge
- `frontend/src/features/story-links/components/StoryLinksSection.tsx` — update badge

## Dependencies

None

## Acceptance Criteria

- [ ] `getLinkLabel("depends-on", "outbound")` returns `"depends on"`
- [ ] `getLinkLabel("depends-on", "inbound")` returns `"dependent"`
- [ ] `getLinkLabel("created-by", "outbound")` returns `"created by"`
- [ ] `getLinkLabel("created-by", "inbound")` returns `"creates"`
- [ ] `getLinkLabel("context", "outbound")` returns `"context"`
- [ ] `getLinkLabel("context", "inbound")` returns `"context for"`
- [ ] `getLinkLabel("unknown-type", "outbound")` returns `"unknown-type"`
- [ ] Both components render the label string in place of the raw badge

## Intended ADR

None

---
## Implementation Report

**Date**: 2026-07-13

**What was done**: Created `src/shared/utils/linkLabels.ts` with a `getLinkLabel(linkType, direction)` function that maps known link types to human-readable direction-aware labels. Updated `TaskLinkRow.tsx` to use the utility for the type badge. Updated `StoryLinksSection.tsx` to use the utility for the type badge and the delete button `aria-label`.

**Deviations from plan**: The task originally specified `direction: "outbound" | "inbound"` as the parameter type for `getLinkLabel`. The API type `EnrichedTaskLink.direction` is declared as optional (`direction?: "outbound" | "inbound"`), so the function signature was widened to `Direction | undefined` with a fallback to the raw `linkType` string when direction is absent.

**Technical decisions made**: Placed utility in `src/shared/utils/` (not `task-links/utils/`) because both `task-links` and `story-links` features consume it — the conventions require shared code to live in `shared/`, not in one feature.

**Code locations**:
- `frontend/src/shared/utils/linkLabels.ts` — new utility
- `frontend/src/features/tasks/components/TaskLinkRow.tsx` — badge updated
- `frontend/src/features/story-links/components/StoryLinksSection.tsx` — badge + aria-label updated

**Technical debt noted**: None.

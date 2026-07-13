---
status: Accepted
type: fix
priority: P2
date: 2026-07-13
---

# STORY-018: Direction-aware link type labels

## Desired Outcome

Link type badges in TaskDetailModal and StorySlideOver show human-readable, direction-aware
labels instead of the raw `link_type` slug.

## Context

STORY-006 implemented task and story links with a `link_type` field (e.g. `depends-on`) and a
`direction` field (`outbound` | `inbound`). Both `TaskLinkRow` and `StoryLinksSection` currently
render the raw `link_type` slug in the badge, which is not user-friendly and does not communicate
direction semantics.

## Acceptance Criteria

- [ ] A `getLinkLabel(linkType, direction)` utility exists in `src/shared/utils/linkLabels.ts`
- [ ] The mapping covers: `depends-on` (outbound: "depends on", inbound: "dependent"), `created-by` (outbound: "created by", inbound: "creates"), `context` (both: "context" / "context for")
- [ ] Unknown link types fall back to the raw `link_type` value
- [ ] `TaskLinkRow` uses `getLinkLabel` in the type badge
- [ ] `StoryLinksSection` uses `getLinkLabel` in the type badge
- [ ] No other files are changed

## Edge Cases & Error Scenarios

- [ ] Unknown link_type values render the raw string (graceful degradation)
- [ ] Both outbound and inbound directions produce distinct labels where applicable

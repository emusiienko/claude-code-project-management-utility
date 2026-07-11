---
status: Pending Approval
type: fix
priority: P2
date: 2026-07-11
---

# STORY-017: Board Milestone Filter — Replace Toggle with Combobox

## Desired Outcome

The Board milestone filter is a `<select>` combobox that lists all project milestones. The user
can switch freely between "All stories" and any specific milestone without navigating away.

## Context

The existing filter is a binary banner: once the user clicks "Show all stories", there is no way
to return to the active-milestone filter without navigating away and back. This is a usability
dead end, especially on projects with multiple milestones.

## Acceptance Criteria

- [ ] A `<select>` combobox replaces the banner+toggle in the Board header area
- [ ] The combobox lists all milestones for the current project (name + status hint in parens, e.g. "Sprint 1 (Active)")
- [ ] An "All stories" option appears at the top of the list
- [ ] On mount (and on project navigation change), the combobox defaults to the active milestone if one exists, otherwise to "All stories"
- [ ] Changing the combobox selection immediately re-filters the Board stories
- [ ] The combobox is not shown while milestones are still loading
- [ ] When the project has no milestones, only "All stories" is shown (combobox still visible for consistency)
- [ ] All interactive elements are keyboard-accessible

## Edge Cases & Error Scenarios

- [ ] Project with no milestones: combobox shows only "All stories"; board shows all stories
- [ ] Previously-active milestone is finished or deleted: combobox defaults to "All stories" (no crash)
- [ ] Project navigation change resets selection to default (active milestone or "All stories")

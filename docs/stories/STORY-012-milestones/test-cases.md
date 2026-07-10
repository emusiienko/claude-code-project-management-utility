# STORY-012 Test Cases

| ID | Title | Tags |
|----|-------|------|
| [tc-001](test-cases/tc-001-milestones-tab-empty-state.md) | Milestones tab — always present, empty state when no milestones | @smoke @regression |
| [tc-002](test-cases/tc-002-milestone-create.md) | Create a milestone — required fields, optional description | @smoke @regression |
| [tc-003](test-cases/tc-003-milestone-list-and-fields.md) | Milestones tab list — name, status badge, story count, description | @smoke @regression |
| [tc-004](test-cases/tc-004-milestone-edit.md) | Edit a milestone — name and description update | @smoke @regression |
| [tc-005](test-cases/tc-005-milestone-delete-nullifies-stories.md) | Delete a milestone — assigned stories lose milestone link, stories not deleted | @smoke @regression |
| [tc-006](test-cases/tc-006-lifecycle-activate-finish.md) | Milestone lifecycle — Planned → Active → Finished → Active (re-activate) | @smoke @regression |
| [tc-007](test-cases/tc-007-single-active-confirmation.md) | Single-active invariant — confirmation dialog when activating with existing Active milestone | @smoke @regression |
| [tc-008](test-cases/tc-008-board-active-milestone-filter.md) | Board — active milestone filter applied on load, toggle to show all | @smoke @regression |
| [tc-009](test-cases/tc-009-board-no-active-milestone.md) | Board — no active milestone shows all stories with no filter indicator | @smoke @regression |
| [tc-010](test-cases/tc-010-board-empty-state-filtered.md) | Board — empty state when active milestone has no stories assigned | @regression |
| [tc-011](test-cases/tc-011-board-filter-cleared-on-finish.md) | Board — filter removed when Active milestone is set to Finished | @regression |
| [tc-012](test-cases/tc-012-story-assignment-set-and-clear.md) | Story form — assign and clear milestone; only same-project milestones shown | @smoke @regression |
| [tc-013](test-cases/tc-013-story-view-milestone-visible.md) | Story view — current milestone assignment is visible in slide-over and can be changed | @smoke @regression |
| [tc-014](test-cases/tc-014-milestone-detail-page.md) | Milestone Detail page — shows milestone info and assigned stories list | @smoke @regression |
| [tc-015](test-cases/tc-015-duplicate-name-error.md) | Edge case — duplicate milestone name within the same project shows conflict error | @regression |
| [tc-016](test-cases/tc-016-delete-project-removes-milestones.md) | Edge case — deleting a project removes all its milestones; affected stories lose milestone link | @regression |
| [tc-017](test-cases/tc-017-milestones-tab-visual.md) | Milestones tab — visual layout at all breakpoints | @smoke @regression |
| [tc-018](test-cases/tc-018-milestone-detail-visual.md) | Milestone Detail page — visual layout at all breakpoints | @smoke @regression |

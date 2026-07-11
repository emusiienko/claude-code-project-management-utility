# QA Test Cases — Master Index

| ID | Title | Tags | Story | Status |
|----|-------|------|-------|--------|
| [TC-001](test-cases/TC-001-system-settings-screen-visual.md) | System Settings screen — visual pass | @smoke @regression | STORY-002 | Active |
| [TC-002](test-cases/TC-002-project-settings-screen-visual.md) | Project Settings screen — visual pass | @smoke @regression | STORY-002 | Active |
| [TC-003](test-cases/TC-003-edit-dictionary-value-interaction.md) | Edit dictionary value — inline interaction states | @regression | STORY-002 | Active |
| [TC-004](test-cases/TC-004-main-navigation.md) | Main navigation items match planned screens | @smoke @regression | STORY-002 | Inactive — superseded by TC-023, TC-034 (STORY-016) |
| [TC-005](test-cases/TC-005-projects-screen-visual.md) | Projects screen — visual pass | @smoke @regression | STORY-003 | Active |
| [TC-006](test-cases/TC-006-create-project-success.md) | Create project — form open, submit, list refresh | @regression | STORY-003 | Active |
| [TC-007](test-cases/TC-007-create-project-duplicate-name.md) | Create project — duplicate name shows inline conflict error | @regression | STORY-003 | Active |
| [TC-008](test-cases/TC-008-edit-project-success.md) | Edit project — update name and description, list reflects changes | @regression | STORY-003 | Active |
| [TC-009](test-cases/TC-009-edit-project-duplicate-name.md) | Edit project — duplicate name shows inline conflict error | @regression | STORY-003 | Active |
| [TC-010](test-cases/TC-010-delete-project-confirmation.md) | Delete project — confirmation dialog warns about nested data, project is removed | @regression | STORY-003 | Active |
| [TC-011](test-cases/TC-011-projects-empty-state.md) | Projects screen — empty state renders correctly | @regression | STORY-003 | Active |
| [TC-012](test-cases/TC-012-stories-list-view-visual.md) | Stories list view — visual layout | @smoke @regression | STORY-004 | Active |
| [TC-013](test-cases/TC-013-create-story-modal-visual.md) | Create story modal — visual layout | @smoke @regression | STORY-004 | Active |
| [TC-014](test-cases/TC-014-create-story-happy-path.md) | Create story — happy path | @smoke @regression | STORY-004 | Active |
| [TC-015](test-cases/TC-015-create-story-title-validation.md) | Create story — empty title validation | @regression | STORY-004 | Active |
| [TC-016](test-cases/TC-016-edit-story-modal.md) | Edit story — modal pre-filled and save updates in place | @smoke @regression | STORY-004 | Active |
| [TC-017](test-cases/TC-017-delete-story-confirmed.md) | Delete story — confirmation dialog and confirmed delete | @smoke @regression | STORY-004 | Active |
| [TC-018](test-cases/TC-018-delete-story-cancelled.md) | Delete story — cancel from confirmation dialog | @regression | STORY-004 | Active |
| [TC-019](test-cases/TC-019-filter-by-status.md) | Filter bar — filter by status | @regression | STORY-004 | Active |
| [TC-020](test-cases/TC-020-filter-by-label.md) | Filter bar — filter by label key and value | @regression | STORY-004 | Active |
| [TC-021](test-cases/TC-021-empty-state.md) | Empty state — project with no stories | @smoke @regression | STORY-004 | Active |
| [TC-022](test-cases/TC-022-labels-editor.md) | Labels editor — add and remove labels | @regression | STORY-004 | Active |
| [TC-023](test-cases/TC-023-top-bar-app-switcher.md) | Top bar and app switcher | @smoke @regression | STORY-016 | Active |
| [TC-024](test-cases/TC-024-collapsible-sidebar.md) | Collapsible sidebar | @smoke @regression | STORY-016 | Active |
| [TC-025](test-cases/TC-025-sub-nav-four-tabs.md) | Sub-nav — four tabs, active highlight, Milestones placeholder | @smoke @regression | STORY-016 | Active |
| [TC-026](test-cases/TC-026-projects-full-page.md) | /projects — full-page management, no sidebar, no sub-nav | @smoke @regression | STORY-016 | Active |
| [TC-027](test-cases/TC-027-stories-list-crud.md) | Stories list at /projects/:id/stories — CRUD preserved, title click opens slide-over | @smoke @regression | STORY-016 | Active |
| [TC-028](test-cases/TC-028-board-view.md) | Board view — kanban columns by status, card click opens slide-over | @smoke @regression | STORY-016 | Active |
| [TC-029](test-cases/TC-029-story-detail-slideover.md) | Story Detail slide-over — animation, header, close behaviors, right panel, deep-link | @smoke @regression | STORY-016 | Active |
| [TC-030](test-cases/TC-030-settings-system-only.md) | /settings shows only System Defaults — no Project Overrides tab | @smoke @regression | STORY-016 | Active |
| [TC-031](test-cases/TC-031-project-settings.md) | /projects/:id/settings — project dictionary overrides | @smoke @regression | STORY-016 | Active |
| [TC-032](test-cases/TC-032-root-redirect.md) | / redirect — to last project or /projects | @smoke @regression | STORY-016 | Active |
| [TC-033](test-cases/TC-033-edge-cases-not-found.md) | Edge cases — non-existent project, non-existent story | @regression | STORY-016 | Active |
| [TC-034](test-cases/TC-034-sessions-mode.md) | Sessions mode — no sidebar, no sub-nav, no Settings button | @smoke @regression | STORY-016 | Active |
| [TC-035](test-cases/TC-035-milestones-tab-empty-state.md) | Milestones tab — always present, empty state when no milestones | @smoke @regression | STORY-012 | Active |
| [TC-036](test-cases/TC-036-milestone-create.md) | Create a milestone — required fields, optional description | @smoke @regression | STORY-012 | Active |
| [TC-037](test-cases/TC-037-milestone-list-and-fields.md) | Milestones tab list — name, status badge, story count, description | @smoke @regression | STORY-012 | Active |
| [TC-038](test-cases/TC-038-milestone-edit.md) | Edit a milestone — name and description update | @smoke @regression | STORY-012 | Active |
| [TC-039](test-cases/TC-039-milestone-delete-nullifies-stories.md) | Delete a milestone — assigned stories lose milestone link, stories not deleted | @smoke @regression | STORY-012 | Active |
| [TC-040](test-cases/TC-040-lifecycle-activate-finish.md) | Milestone lifecycle — Planned → Active → Finished → Active (re-activate) | @smoke @regression | STORY-012 | Active |
| [TC-041](test-cases/TC-041-single-active-confirmation.md) | Single-active invariant — confirmation dialog when activating with existing Active milestone | @smoke @regression | STORY-012 | Active |
| [TC-042](test-cases/TC-042-board-active-milestone-filter.md) | Board — milestone combobox defaults to active milestone, re-filters on selection change | @smoke @regression | STORY-012 | Active |
| [TC-043](test-cases/TC-043-board-no-active-milestone.md) | Board — no active milestone defaults combobox to "All stories" | @smoke @regression | STORY-012 | Active |
| [TC-044](test-cases/TC-044-board-empty-state-filtered.md) | Board — empty state when active milestone has no stories assigned | @regression | STORY-012 | Active |
| [TC-045](test-cases/TC-045-board-filter-cleared-on-finish.md) | Board — filter removed when Active milestone is set to Finished | @regression | STORY-012 | Active |
| [TC-046](test-cases/TC-046-story-assignment-set-and-clear.md) | Story form — assign and clear milestone; only same-project milestones shown | @smoke @regression | STORY-012 | Active |
| [TC-047](test-cases/TC-047-story-view-milestone-visible.md) | Story view — current milestone assignment is visible in slide-over and can be changed | @smoke @regression | STORY-012 | Active |
| [TC-048](test-cases/TC-048-milestone-detail-page.md) | Milestone Detail page — shows milestone info and assigned stories list | @smoke @regression | STORY-012 | Active |
| [TC-049](test-cases/TC-049-duplicate-name-error.md) | Edge case — duplicate milestone name within the same project shows conflict error | @regression | STORY-012 | Active |
| [TC-050](test-cases/TC-050-delete-project-removes-milestones.md) | Edge case — deleting a project removes all its milestones; affected stories lose milestone link | @regression | STORY-012 | Active |
| [TC-051](test-cases/TC-051-milestones-tab-visual.md) | Milestones tab — visual layout at all breakpoints | @smoke @regression | STORY-012 | Active |
| [TC-052](test-cases/TC-052-milestone-detail-visual.md) | Milestone Detail page — visual layout at all breakpoints | @smoke @regression | STORY-012 | Active |

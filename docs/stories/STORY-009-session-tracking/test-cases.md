# STORY-009 Test Cases — Session Tracking

- **[tc-001](test-cases/tc-001-sessions-mode-navigation.md)** — Sessions mode — top-level app-switcher entry, own project-selector sidebar, project switch re-scopes the session list
  `@smoke @regression`
- **[tc-002](test-cases/tc-002-sessions-list-visual.md)** — Sessions list screen — visual pass
  `@smoke @regression`
- **[tc-003](test-cases/tc-003-sessions-list-empty-state.md)** — Sessions list — empty state ("No sessions yet") when active project has no sessions
  `@smoke @regression`
- **[tc-004](test-cases/tc-004-create-session-form-visual.md)** — Create Session form — visual pass
  `@smoke @regression`
- **[tc-005](test-cases/tc-005-create-session-happy-path.md)** — Create session — happy path (required fields only, then all fields)
  `@smoke @regression`
- **[tc-006](test-cases/tc-006-create-session-required-field-validation.md)** — Create session — missing topic / goal / participant_role shows inline validation errors
  `@regression`
- **[tc-007](test-cases/tc-007-create-session-participant-role-dropdown.md)** — Create session — participant_role is a dictionary-driven dropdown, not free text
  `@regression`
- **[tc-008](test-cases/tc-008-create-session-link-to-story-or-task.md)** — Create session — independent optional links to a story and a task, scoped to the active project only
  `@regression`
- **[tc-009](test-cases/tc-009-session-detail-visual.md)** — Session Detail view — visual pass
  `@smoke @regression`
- **[tc-010](test-cases/tc-010-session-detail-edit-fields.md)** — Session Detail — edit topic/goal/context/status/participant_role/links, save reflects in list and detail
  `@smoke @regression`
- **[tc-011](test-cases/tc-011-session-detail-mandatory-fields-cannot-clear.md)** — Session Detail — topic/goal/participant_role/status cannot be cleared, only changed
  `@regression`
- **[tc-012](test-cases/tc-012-session-detail-mark-complete-toggle.md)** — Session Detail — three-way status control (pending/in-progress/finished), independent of result fields
  `@smoke @regression`
- **[tc-013](test-cases/tc-013-session-detail-linked-item-navigation.md)** — Session Detail — clicking a linked story/task navigates to its own detail view in Task Manager
  `@regression`
- **[tc-014](test-cases/tc-014-archive-session.md)** — Archive a session — from the list row action and from Session Detail; archived session stays fully editable
  `@smoke @regression`
- **[tc-015](test-cases/tc-015-sessions-list-filters.md)** — Sessions list — "incomplete only" and "linked to story" filters, independently combinable
  `@regression`
- **[tc-016](test-cases/tc-016-sessions-list-pagination.md)** — Sessions list — pagination
  `@regression`
- **[tc-017](test-cases/tc-017-long-content-and-session-volume.md)** — Long content and many sessions do not break list or detail layout
  `@regression`

# STORY-022 Test Cases — Global Project Navigation Entry

> Rewritten 2026-07-22 against Revision 3 (state-driven slide-over overlay for Projects/Config, TASK-009/010/011), superseding the routing-based models from Revisions 1–2.

- **[tc-001](test-cases/tc-001-global-entry-task-manager-mode.md)** — Global Projects entry opens the Projects overlay in Task Manager mode
  `@smoke @regression`
- **[tc-002](test-cases/tc-002-global-entry-sessions-mode.md)** — Global Projects and Config entries visible and functional in Sessions mode
  `@smoke @regression`
- **[tc-003](test-cases/tc-003-active-page-indication.md)** — Open/active indication on both entries, driven by overlay state
  `@regression`
- **[tc-004](test-cases/tc-004-keyboard-accessibility.md)** — Keyboard accessibility of the top-bar triggers and panel controls
  `@regression`
- **[tc-005](test-cases/tc-005-sidebar-link-removed.md)** — Task Manager sidebar "Manage projects" link removed
  `@smoke @regression`
- **[tc-006](test-cases/tc-006-mode-switch-position-stable.md)** — Mode switching does not move or hide the global Projects/Config entries
  `@regression`
- **[tc-007](test-cases/tc-007-dismisses-open-slideover-and-modal.md)** — The overlay opens on top of and stays usable over an open Story slide-over / Task Detail modal
  `@regression`
- **[tc-008](test-cases/tc-008-visible-in-empty-state.md)** — Cold start with zero projects auto-opens the Projects overlay; entries stay functional with/without projects
  `@regression`
- **[tc-009](test-cases/tc-009-project-name-click-lands-on-settings.md)** — Projects overlay: selecting a project pushes its Settings panel (no route change)
  `@smoke @regression`
- **[tc-010](test-cases/tc-010-sidebar-selection-still-lands-on-stories.md)** — Task Manager sidebar project selection still lands on Stories
  `@regression`
- **[tc-011](test-cases/tc-011-no-overrides-project-lands-on-inherited-settings.md)** — Project with no settings overrides — Settings panel shows inherited defaults, no crash
  `@regression`
- **[tc-012](test-cases/tc-012-top-bar-visual-both-modes.md)** — Visual: global entries and the ~70vw overlay panel, across breakpoints and both modes
  `@regression`
- **[tc-013](test-cases/tc-013-back-vs-dismiss.md)** — Back vs Dismiss — distinct stack-pop vs full-close behavior on both overlays
  `@regression`
- **[tc-014](test-cases/tc-014-open-in-task-manager-bridge.md)** — "Open in Task Manager" bridge resolves BUG-006 for a project not yet opened this session
  `@smoke @regression`
- **[tc-015](test-cases/tc-015-main-view-stays-mounted.md)** — The main view never unmounts or navigates while the Projects/Config overlay is open
  `@regression`

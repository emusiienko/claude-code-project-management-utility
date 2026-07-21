---
status: ToDo
assignee: qa-automation
story: STORY-022
---

# TASK-008: Write automated tests

## What to implement
Write automated tests covering the redesigned closable-view navigation model
(TASK-006, TASK-007), and re-align the existing top-bar tests that encode the
now-reversed "Config is Task-Manager-only" behavior. Extends the coverage from
TASK-002 and TASK-005.

**Behaviors:**
- Config entry visible and interactive in both Task Manager mode and Sessions mode
- Config entry shows active/current-page indication on the Config route and is keyboard-accessible
- Projects and Config entries hold the same on-screen position across a mode switch
- App-switcher reflects the underlying main view while a closable view is open (opening Config or Projects from Sessions keeps the switcher on Sessions; from Task Manager keeps it on Task Manager)
- Closing the Projects page returns to the recorded last main view — verify a deep Task Manager URL restores exactly, and a Sessions origin returns to Sessions
- Closing the Config page returns to the recorded last main view under the same rules
- Cold load directly into a closable view with no recorded main view: closing falls back to `/` and lands on a Task Manager destination
- Last main-view URL is recorded on main-view route changes and is not overwritten by opening a closable view

**Test re-alignment (existing coverage that now asserts the old behavior):**
- Top-bar tests asserting Config was hidden/disabled outside Task Manager mode must be updated to the global-Config behavior
- Any test asserting the mounted-but-hidden Config placeholder (BUG-003) must be updated to the two-always-present-entries behavior

**Regression guard (still-valid STORY-022 behaviors):**
- Projects entry visible in both modes
- Projects entry exact-match active state (stays inactive on `/projects/:id/settings`) — BUG-001
- Project-name click on the Projects page resolves to the standalone Project Settings screen (heading + back-link to `/projects`)
- The `⚙ Manage projects` sidebar link stays removed; sidebar project selection still lands on Stories
- Bare `/projects/:id` still redirects to Stories

## Scope
Frontend component/integration tests for the top bar, the closable-view pages'
close behavior, and the navigation-model record. No production code changes.

## Dependencies
TASK-006, TASK-007 (implementation must be complete before these tests can run green).

## Acceptance Criteria
- [ ] All listed behaviors, re-alignments, and regression guards have at least one test
- [ ] The previously-passing STORY-022 suite is updated so no test still asserts the reversed Config gating
- [ ] Tests pass against the running application (`npx vitest run` green)

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:

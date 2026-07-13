---
status: Pending Approval
type: fix
priority: P2
date: 2026-07-13
---

# STORY-011: Fix link_types Default Dictionary Values

## Desired Outcome
The `link_types` system-level dictionary ships with the correct default values that reflect the
bidirectional linking model used in the task-linking domain.

## Context
The original seed in migration `0002_settings` populated `link_types` with `["depends-on", "context"]`.
This predated the implementation of STORY-006 (Work Item Linking), which established a bidirectional
link model. The correct canonical values are `["depends-on", "dependent", "created-by", "creates"]`.

Both the seed (for fresh installs) and a data migration (for existing databases) must be updated
so that all environments — new and existing — have the correct defaults.

## Acceptance Criteria
- [ ] `backend/migrations/versions/0002_settings.py` — `link_types` seed values updated to
      `["depends-on", "dependent", "created-by", "creates"]`
- [ ] A new Alembic migration (`0008_update_link_types_defaults.py`) is created that updates the
      `link_types` row in the `system_settings` table for existing databases
- [ ] The migration is reversible (downgrade restores `["depends-on", "context"]`)
- [ ] Full test suite passes with no regressions

## Edge Cases & Error Scenarios
- [ ] Projects that have overridden `link_types` at the project level are unaffected — only the
      system-level row is modified

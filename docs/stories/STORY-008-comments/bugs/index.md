| ID | Title | Severity | Status | Assignee |
|----|-------|----------|--------|----------|
| [BUG-001](BUG-001-missing-default-web-ui-role-migration.md) | Missing data migration for `default_web_ui_role`/`operator` seed breaks System Settings + comment author-role pre-fill | critical | resolved | backend-developer |
| [BUG-002](BUG-002-mention-combobox-not-closing-on-enter.md) | @role mention combobox does not close after Enter-key selection (mouse click works) | major | resolved | frontend-developer |
| [BUG-003](BUG-003-comment-content-long-word-overflow.md) | A single long unbroken word in comment content overflows and is clipped instead of wrapping | minor | resolved | frontend-developer |
| [BUG-004](BUG-004-migration-revision-id-too-long.md) | Migration `0012_default_web_ui_role_backfill` revision id too long for PostgreSQL's `alembic_version.version_num` column, blocking `./deploy.sh rebuild` on Postgres | critical | fixed | backend-developer |

"""Backfill `default_web_ui_role` and `"operator"` for pre-existing databases.

Revision ID: 0012_default_web_ui_role_backfill
Revises: 0011_comment
Create Date: 2026-07-20

STORY-008/TASK-005 edited `0002_settings.py` in place to seed the new
`default_web_ui_role` system setting and add `"operator"` to the seeded
`participant_roles` list, on the assumption every environment would run the
migration chain from scratch. Alembic only tracks whether a revision id has
run, not its content — on a database where `0002_settings` had already been
applied *before* that edit landed, the edited seed never re-runs, so the
`system_settings` table is missing the `default_web_ui_role` row entirely and
its `participant_roles` row lacks `"operator"` (BUG-001).

This is a data-only, additive, idempotent backfill:
- If the system `participant_roles` row exists and lacks `"operator"`, append it.
- If the system `default_web_ui_role` row is missing, insert it as `"operator"`.

Both checks are no-ops on a database that already has the correct data (either
a fresh install seeded by the current `0002_settings.py`, or a database this
migration already ran against) — safe to run any number of times.

Deliberately scoped to system-level defaults only, matching TASK-005's
original decision not to touch project-level overrides: a project that has
already overridden `participant_roles` made a deliberate scoping choice, and
no project can have an existing `default_web_ui_role` override since the
setting did not exist before this story.

Downgrade removes `"operator"` from the system `participant_roles` row (if
present) and deletes the system `default_web_ui_role` row (if present) —
the inverse backfill, not a destructive rewrite of unrelated data.
"""

import json
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_default_web_ui_role_backfill"
down_revision: Union[str, None] = "0011_comment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PARTICIPANT_ROLES_KEY = "participant_roles"
_DEFAULT_WEB_UI_ROLE_KEY = "default_web_ui_role"
_OPERATOR_ROLE = "operator"


def _fetch_row(connection: sa.engine.Connection, key: str) -> tuple | None:
    # Quote `values` — reserved word in SQLite/PostgreSQL.
    return connection.execute(
        sa.text('SELECT key, "values" FROM system_settings WHERE key = :key'),  # noqa: S608
        {"key": key},
    ).fetchone()


def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(tz=timezone.utc)

    participant_roles_row = _fetch_row(bind, _PARTICIPANT_ROLES_KEY)
    if participant_roles_row is not None:
        raw_values = participant_roles_row[1]
        values: list = raw_values if isinstance(raw_values, list) else json.loads(raw_values)
        if _OPERATOR_ROLE not in values:
            bind.execute(
                sa.text(
                    'UPDATE system_settings SET "values" = :v, updated_at = :ts '
                    "WHERE key = :key"
                ),
                {
                    "v": json.dumps([*values, _OPERATOR_ROLE]),
                    "ts": now,
                    "key": _PARTICIPANT_ROLES_KEY,
                },
            )

    default_web_ui_role_row = _fetch_row(bind, _DEFAULT_WEB_UI_ROLE_KEY)
    if default_web_ui_role_row is None:
        bind.execute(
            sa.text(
                'INSERT INTO system_settings (key, "values", updated_at) '
                "VALUES (:key, :v, :ts)"
            ),
            {
                "key": _DEFAULT_WEB_UI_ROLE_KEY,
                "v": json.dumps(_OPERATOR_ROLE),
                "ts": now,
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    now = datetime.now(tz=timezone.utc)

    participant_roles_row = _fetch_row(bind, _PARTICIPANT_ROLES_KEY)
    if participant_roles_row is not None:
        raw_values = participant_roles_row[1]
        values: list = raw_values if isinstance(raw_values, list) else json.loads(raw_values)
        if _OPERATOR_ROLE in values:
            bind.execute(
                sa.text(
                    'UPDATE system_settings SET "values" = :v, updated_at = :ts '
                    "WHERE key = :key"
                ),
                {
                    "v": json.dumps([v for v in values if v != _OPERATOR_ROLE]),
                    "ts": now,
                    "key": _PARTICIPANT_ROLES_KEY,
                },
            )

    bind.execute(
        sa.text("DELETE FROM system_settings WHERE key = :key"),
        {"key": _DEFAULT_WEB_UI_ROLE_KEY},
    )

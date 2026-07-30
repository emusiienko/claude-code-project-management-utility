"""Fix stale pre-amendment `session` schema drift (is_complete/nullable status).

Revision ID: 0014_session_status_backfill
Revises: 0013_session
Create Date: 2026-07-29

STORY-009 TASK-008 amended `0013_session.py` in place — replacing the
original `is_complete` boolean column with a mandatory `status` enum column —
reasoning that the `session` table only existed on this unmerged feature
branch, so no already-migrated database needed a forward migration (see that
revision's docstring). That assumption didn't hold in practice: a local dev
database that had already run the *original* `0013_session` (the version that
created `is_complete` and a nullable, no-default `status` column, back when
TASK-003 first introduced the table) already has `alembic_version` pinned at
`0013_session`. Alembic keys upgrade/downgrade off the revision id, not the
migration file's content, so `alembic upgrade head` against that database is a
no-op — the amended `upgrade()` never re-runs. Every pre-existing row keeps
`status = NULL` and `is_complete` stays on the table, and the app 500s because
`Session.status` is a mandatory Pydantic field.

This is a new, additive, idempotent corrective migration — the same pattern
already used by `0012_web_ui_role_backfill` for an equivalent in-place-edit
drift. Editing `0013_session` yet again would repeat the exact same mistake
for any database already pinned at that revision id; a new revision is the
only thing `alembic upgrade head` is guaranteed to actually run everywhere.

Detection is structural, not version-based: inspect the live `session` table
for the `is_complete` column, the tell for the pre-amendment schema.

- If present: backfill any NULL `status` to `"pending"`, tighten `status` to
  NOT NULL with a `"pending"` server default (add/backfill/tighten — same
  convention as `0010_attachment_title`), drop `is_complete`, and replace the
  old `ix_session_project_complete` index with `ix_session_project_status`
  (matching the index `0013_session` already declares today).
- If absent (a fresh install that only ever saw the current `0013_session`,
  or a database this migration already fixed up): every step is skipped —
  safe to run any number of times.

Downgrade is a deliberate no-op. Whether `upgrade()` actually fixed up a
stale database or found nothing to do (the fresh-install case) is
indistinguishable from the resulting table shape alone — both leave `session`
with no `is_complete` column — so there is no reliable signal to invert
against. This is fine in practice: downgrading any further, past
`0013_session`, drops the whole `session` table outright (see that
revision's `downgrade()`), which is the only downgrade path this repo's own
tooling exercises (migration tests upgrade to head, then downgrade well past
`0013_session`). A downgrade that stops exactly at this revision is not a
supported/tested path.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_session_status_backfill"
down_revision: Union[str, None] = "0013_session"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_OLD_INDEX = "ix_session_project_complete"
_NEW_INDEX = "ix_session_project_status"


def _session_columns(bind) -> set[str]:
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns("session")}


def _session_indexes(bind) -> set[str]:
    inspector = sa.inspect(bind)
    return {idx["name"] for idx in inspector.get_indexes("session")}


def upgrade() -> None:
    bind = op.get_bind()

    if "is_complete" not in _session_columns(bind):
        # Already the current shape (fresh install, or already fixed up by
        # this migration) — nothing to do.
        return

    # Backfill before tightening the constraint, so no existing NULL row can
    # ever violate the NOT NULL we're about to add.
    bind.execute(sa.text("UPDATE session SET status = 'pending' WHERE status IS NULL"))

    if _OLD_INDEX in _session_indexes(bind):
        op.drop_index(_OLD_INDEX, table_name="session")

    with op.batch_alter_table("session", schema=None) as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(20),
            type_=sa.String(20),
            nullable=False,
            server_default="pending",
        )
        batch_op.drop_column("is_complete")

    if _NEW_INDEX not in _session_indexes(bind):
        op.create_index(_NEW_INDEX, "session", ["project_id", "status"])


def downgrade() -> None:
    # See module docstring: intentionally a no-op. There is no reliable way
    # to tell "upgrade fixed up a stale schema" apart from "there was nothing
    # to fix" once the fix has been applied — both leave the same table
    # shape — and every downgrade path this repo exercises goes on to drop
    # the whole `session` table at `0013_session` anyway.
    pass

"""Replace attachment.type with a mandatory title; retire attachment_types rows.

Revision ID: 0010_attachment_title
Revises: 0009_attachment
Create Date: 2026-07-15

STORY-021 replaces the dictionary-bound `type` field on attachment with a
mandatory free-form `title` (max 500 chars). This is a real forward migration
against a populated database (0009_attachment is already deployed), not a
rewrite: it adds `title` nullable, backfills every existing row's `title`
from its former `type` value, tightens `title` to NOT NULL, then drops `type`.

The container-list index moves from keying on `type` to keying on `kind`,
since `type` is gone and `kind` is now the list's filter column.

The now-unused `attachment_types` dictionary rows are deleted from both
system_settings and project_settings — `type` was their only reader.
`0002_settings` (which seeds `attachment_types` on a fresh install) is
immutable per ADR-010; this revision deletes the row it seeded, which is
correct and idempotent on both fresh and existing databases.

batch_alter_table is used for the column add/alter/drop sequence so the
table-rebuild SQLite requires is portable to PostgreSQL's plain ALTER TABLE
(ADR-013 precedent, see 0004_milestone).

Downgrade restores the `type` column (backfilled from `title`, truncated to
its original 100-char limit) and the original index, then re-seeds the
system-level `attachment_types` default row. Project-level `attachment_types`
overrides deleted by the upgrade are not recoverable — their values are gone
once deleted, same as any other destructive data change.
"""

from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_attachment_title"
down_revision: Union[str, None] = "0009_attachment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Mirrors the attachment_types seed row from 0002_settings — needed to
# re-seed the system-level default on downgrade (0002_settings is immutable).
_ATTACHMENT_TYPES_SEED_VALUES = [
    "plan",
    "document",
    "image",
    "implementation-report",
    "test-result",
    "external-ref",
]
_DOWNGRADE_SEED_TIMESTAMP = datetime(2026, 7, 15, 0, 0, 0, tzinfo=timezone.utc)


def upgrade() -> None:
    # Index references the soon-to-be-dropped `type` column — drop it first.
    op.drop_index("ix_attachment_container_type", table_name="attachment")

    with op.batch_alter_table("attachment", schema=None) as batch_op:
        batch_op.add_column(sa.Column("title", sa.String(500), nullable=True))

    bind = op.get_bind()
    bind.execute(sa.text("UPDATE attachment SET title = type"))

    with op.batch_alter_table("attachment", schema=None) as batch_op:
        batch_op.alter_column("title", nullable=False)
        batch_op.drop_column("type")

    op.create_index(
        "ix_attachment_container_kind",
        "attachment",
        ["container_type", "container_id", "kind"],
    )

    bind.execute(sa.text("DELETE FROM system_settings WHERE key = 'attachment_types'"))
    bind.execute(sa.text("DELETE FROM project_settings WHERE key = 'attachment_types'"))


def downgrade() -> None:
    op.drop_index("ix_attachment_container_kind", table_name="attachment")

    with op.batch_alter_table("attachment", schema=None) as batch_op:
        batch_op.add_column(sa.Column("type", sa.String(100), nullable=True))

    bind = op.get_bind()
    # Truncate back to type's original 100-char limit — title allows up to 500.
    bind.execute(sa.text("UPDATE attachment SET type = substr(title, 1, 100)"))

    with op.batch_alter_table("attachment", schema=None) as batch_op:
        batch_op.alter_column("type", nullable=False)
        batch_op.drop_column("title")

    op.create_index(
        "ix_attachment_container_type",
        "attachment",
        ["container_type", "container_id", "type"],
    )

    system_settings_table = sa.table(
        "system_settings",
        sa.column("key", sa.String),
        sa.column("values", sa.JSON),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(
        system_settings_table,
        [
            {
                "key": "attachment_types",
                "values": _ATTACHMENT_TYPES_SEED_VALUES,
                "updated_at": _DOWNGRADE_SEED_TIMESTAMP,
            }
        ],
    )

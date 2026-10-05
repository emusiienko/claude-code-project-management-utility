"""Replace the attachment/comment container pair with real container FKs.

Revision ID: 0015_attachment_comment_container_fks
Revises: 0014_session_status_backfill
Create Date: 2026-10-05

STORY-016 / ADR-034. `attachment` and `comment` stop pointing at their
container through the FK-less (container_type, container_id) pair and carry
three nullable keys instead — `story_id`, `task_id`, `milestone_id`, each an
`ON DELETE CASCADE` FK — with a CHECK that exactly one is set. The database
now removes the rows when any container is deleted; stored files are removed
by the orphan file sweep.

Schema-only: no backfill and no row cleanup. The old pair cannot be mapped to
the new keys without a data step, so a table that still holds rows fails the
new CHECK and with it this revision — no row is silently dropped. Wipe the
database before upgrading.

batch_alter_table rebuilds each table on SQLite and is plain ALTER TABLE on
PostgreSQL; the DDL is the same on both dialects. SQLite migrations run with
FK enforcement off (migrations/env.py), so the rebuild never cascades.

Downgrade restores the pair and the old index, also schema-only; it fails on a
table that still holds rows because the restored pair is NOT NULL.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_attachment_comment_container_fks"
down_revision: Union[str, None] = "0014_session_status_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CONTAINER_TABLES = {
    "story_id": "story",
    "task_id": "task",
    "milestone_id": "milestone",
}

_ONE_CONTAINER_CHECK = (
    "(story_id IS NOT NULL AND task_id IS NULL AND milestone_id IS NULL)"
    " OR (story_id IS NULL AND task_id IS NOT NULL AND milestone_id IS NULL)"
    " OR (story_id IS NULL AND task_id IS NULL AND milestone_id IS NOT NULL)"
)

# (table, old index, second column of the new indexes, new-index name suffix)
_TABLES = (
    ("attachment", "ix_attachment_container_kind", "kind", "kind"),
    ("comment", "ix_comment_container_created", "created_at", "created"),
)


def _index_name(table: str, column: str, suffix: str) -> str:
    return f"ix_{table}_{column.removesuffix('_id')}_{suffix}"


def upgrade() -> None:
    for table, old_index, ordering, suffix in _TABLES:
        op.drop_index(old_index, table_name=table)

        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_column("container_type")
            batch_op.drop_column("container_id")
            for column, parent in _CONTAINER_TABLES.items():
                batch_op.add_column(sa.Column(column, sa.String(36), nullable=True))
                batch_op.create_foreign_key(
                    f"fk_{table}_{column}",
                    parent,
                    [column],
                    ["id"],
                    ondelete="CASCADE",
                )
            batch_op.create_check_constraint(
                f"ck_{table}_one_container", _ONE_CONTAINER_CHECK
            )

        for column in _CONTAINER_TABLES:
            op.create_index(
                _index_name(table, column, suffix),
                table,
                [column, ordering],
            )


def downgrade() -> None:
    for table, old_index, ordering, suffix in _TABLES:
        for column in _CONTAINER_TABLES:
            op.drop_index(
                _index_name(table, column, suffix),
                table_name=table,
            )

        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_constraint(f"ck_{table}_one_container", type_="check")
            for column in _CONTAINER_TABLES:
                batch_op.drop_constraint(f"fk_{table}_{column}", type_="foreignkey")
                batch_op.drop_column(column)
            batch_op.add_column(
                sa.Column("container_type", sa.String(20), nullable=False)
            )
            batch_op.add_column(
                sa.Column("container_id", sa.String(36), nullable=False)
            )

        op.create_index(old_index, table, ["container_type", "container_id", ordering])

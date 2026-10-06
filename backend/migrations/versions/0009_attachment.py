"""Create attachment table.

Revision ID: 0009_attachment
Revises: 0008_link_types_structured
Create Date: 2026-07-14

attachment belongs to exactly one container — a story, task or milestone —
through three nullable keys, `story_id`, `task_id` and `milestone_id`, each an
`ON DELETE CASCADE` FK, with a CHECK that exactly one is set (STORY-016 /
ADR-034). The database removes the rows when any container is deleted; stored
files are removed by the orphan file sweep.

STORY-016 folded these keys into this revision, which originally carried no
container foreign keys. A database created from the earlier version must be
wiped before upgrading.

Attachments are immutable and never archived: there is no archived_at column
and no version-history table. No seed data.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_attachment"
down_revision: Union[str, None] = "0008_link_types_structured"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# container key column -> the table it references
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


def _index_name(column: str) -> str:
    return f"ix_attachment_{column.removesuffix('_id')}_type"


def upgrade() -> None:
    op.create_table(
        "attachment",
        # String(36) DDL so the migration runs on both SQLite and PostgreSQL
        # without dialect branching (matches UUIDType).
        sa.Column("id", sa.String(36), primary_key=True),
        *(
            sa.Column(
                column,
                sa.String(36),
                sa.ForeignKey(
                    f"{parent}.id",
                    name=f"fk_attachment_{column}",
                    ondelete="CASCADE",
                ),
                nullable=True,
            )
            for column, parent in _CONTAINER_TABLES.items()
        ),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("mime_type", sa.String(255), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("external_url", sa.String(2000), nullable=True),
        sa.Column("external_status", sa.String(200), nullable=True),
        sa.Column("author_role", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(_ONE_CONTAINER_CHECK, name="ck_attachment_one_container"),
    )

    # Supports listing a container's attachments filtered by type — the
    # primary read pattern for the Attachments section on every host screen.
    for column in _CONTAINER_TABLES:
        op.create_index(_index_name(column), "attachment", [column, "type"])


def downgrade() -> None:
    for column in _CONTAINER_TABLES:
        op.drop_index(_index_name(column), table_name="attachment")
    op.drop_table("attachment")

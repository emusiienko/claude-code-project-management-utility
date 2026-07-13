"""Create task_link table.

Revision ID: 0006_task_link
Revises: 0005_task
Create Date: 2026-07-12

task_link is a directed typed link between two tasks in the same story.
Both source_task_id and target_task_id carry ON DELETE CASCADE FKs toward task.
The cascade is declared as defence-in-depth for PostgreSQL; SQLite ignores it
unless PRAGMA foreign_keys = ON is set (Known Divergences). Application-level
cleanup in the task service handles orphan prevention on both dialects.

A (source_task_id, target_task_id, link_type) unique constraint prevents
duplicate links. Two directional indexes accelerate the list queries that
union both sides (source and target) for a given task.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_task_link"
down_revision: Union[str, None] = "0005_task"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_link",
        # id and FK columns use String(36) DDL so the migration runs on both
        # SQLite and PostgreSQL without dialect branching (matches UUIDType pattern).
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_task_id", sa.String(36), nullable=False),
        sa.Column("target_task_id", sa.String(36), nullable=False),
        sa.Column("link_type", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK to task — valid because task already exists from 0005_task.
        sa.ForeignKeyConstraint(
            ["source_task_id"],
            ["task.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["target_task_id"],
            ["task.id"],
            ondelete="CASCADE",
        ),
        # Uniqueness: one directed link per (source, target, type) triple.
        sa.UniqueConstraint(
            "source_task_id",
            "target_task_id",
            "link_type",
            name="uq_task_link_source_target_type",
        ),
    )

    # Index: source side — list all links where a task is the source.
    op.create_index(
        "ix_task_link_source",
        "task_link",
        ["source_task_id"],
    )

    # Index: target side — list all links where a task is the target.
    op.create_index(
        "ix_task_link_target",
        "task_link",
        ["target_task_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_link_target", table_name="task_link")
    op.drop_index("ix_task_link_source", table_name="task_link")
    op.drop_table("task_link")

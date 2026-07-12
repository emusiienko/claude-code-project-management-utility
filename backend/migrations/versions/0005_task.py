"""Create task table.

Revision ID: 0005_task
Revises: 0004_milestone
Create Date: 2026-07-11

task is a child of story (ON DELETE CASCADE). The FK toward story is declared
inline because story already exists from 0003_story (ADR-010 root-first
inline-FK rule).

No seed data — tasks have no default rows.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_task"
down_revision: Union[str, None] = "0004_milestone"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task",
        # id and FK columns use String(36) DDL so the same migration runs on
        # both SQLite (no native UUID type) and PostgreSQL. The UUIDType custom
        # column type in app/core/database/types.py handles dialect-aware
        # conversion at the ORM layer.
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("story_id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(100), nullable=False),
        sa.Column("assignee_role", sa.String(100), nullable=True),
        sa.Column("creator_role", sa.String(100), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK to story — valid because story already exists from
        # 0003_story (ADR-010 root-first rule).
        sa.ForeignKeyConstraint(
            ["story_id"],
            ["story.id"],
            ondelete="CASCADE",
        ),
    )

    # Index: (story_id, status) — supports filtering tasks by status within a
    # story, the primary Kanban read pattern.
    op.create_index(
        "ix_task_story_status",
        "task",
        ["story_id", "status"],
    )

    # Index: (story_id, type) — supports filtering tasks by type within a story.
    op.create_index(
        "ix_task_story_type",
        "task",
        ["story_id", "type"],
    )

    # Index: (assignee_role) — supports cross-story queries by assignee.
    op.create_index(
        "ix_task_assignee_role",
        "task",
        ["assignee_role"],
    )

    # Index: (creator_role) — supports cross-story queries by creator.
    op.create_index(
        "ix_task_creator_role",
        "task",
        ["creator_role"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_creator_role", table_name="task")
    op.drop_index("ix_task_assignee_role", table_name="task")
    op.drop_index("ix_task_story_type", table_name="task")
    op.drop_index("ix_task_story_status", table_name="task")
    op.drop_table("task")

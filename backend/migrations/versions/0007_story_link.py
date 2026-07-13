"""Create story_link table.

Revision ID: 0007_story_link
Revises: 0006_task_link
Create Date: 2026-07-12

story_link is a directed typed link between two stories in the same project.
Both source_story_id and target_story_id carry ON DELETE CASCADE FKs toward story.
The cascade is declared as defence-in-depth for PostgreSQL; SQLite ignores it
unless PRAGMA foreign_keys = ON is set (Known Divergences). Application-level
cleanup in the story service handles orphan prevention on both dialects.

A (source_story_id, target_story_id, link_type) unique constraint prevents
duplicate links. Two directional indexes accelerate the list queries that
union both sides (source and target) for a given story.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_story_link"
down_revision: Union[str, None] = "0006_task_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "story_link",
        # id and FK columns use String(36) DDL so the migration runs on both
        # SQLite and PostgreSQL without dialect branching (matches UUIDType pattern).
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_story_id", sa.String(36), nullable=False),
        sa.Column("target_story_id", sa.String(36), nullable=False),
        sa.Column("link_type", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK to story — valid because story already exists from 0003_story.
        sa.ForeignKeyConstraint(
            ["source_story_id"],
            ["story.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["target_story_id"],
            ["story.id"],
            ondelete="CASCADE",
        ),
        # Uniqueness: one directed link per (source, target, type) triple.
        sa.UniqueConstraint(
            "source_story_id",
            "target_story_id",
            "link_type",
            name="uq_story_link_source_target_type",
        ),
    )

    # Index: source side — list all links where a story is the source.
    op.create_index(
        "ix_story_link_source",
        "story_link",
        ["source_story_id"],
    )

    # Index: target side — list all links where a story is the target.
    op.create_index(
        "ix_story_link_target",
        "story_link",
        ["target_story_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_story_link_target", table_name="story_link")
    op.drop_index("ix_story_link_source", table_name="story_link")
    op.drop_table("story_link")

"""Create story table.

Revision ID: 0003_story
Revises: 0002_settings
Create Date: 2026-07-07

story is a child of project (ON DELETE CASCADE). The FK to project is declared
inline because project already exists from 0001_project — no deferred FK or
batch_alter_table required (ADR-010).

milestone_id is stored as a plain nullable column without a FK constraint.
The milestone table does not exist until STORY-012; under the root-first,
inline-FK migration strategy (ADR-010) a child FK can only point at an
already-existing parent table. STORY-012 will add the constraint when it
creates the milestone table.

No seed data — stories have no default rows.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_story"
down_revision: Union[str, None] = "0002_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "story",
        # id and FK columns use String(36) DDL so the same migration runs on
        # both SQLite (no native UUID type) and PostgreSQL. The UUIDType custom
        # column type in app/core/database/types.py handles dialect-aware
        # conversion at the ORM layer.
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("status", sa.String(100), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=False),
        # milestone_id has no FK constraint — milestone table does not exist
        # yet. STORY-012 adds the constraint when it creates the milestone table.
        sa.Column("milestone_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK to project — valid because project already exists from
        # 0001_project (ADR-010 root-first rule).
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            ondelete="CASCADE",
        ),
    )

    # Index: (project_id, created_at DESC) — primary sort order for the list
    # endpoint which returns stories ordered by creation time within a project.
    op.create_index(
        "ix_story_project_created_at",
        "story",
        ["project_id", sa.text("created_at DESC")],
    )

    # Index: (project_id, status) — supports filtering stories by status within
    # a project, the most common read pattern.
    op.create_index(
        "ix_story_project_status",
        "story",
        ["project_id", "status"],
    )

    # Index: (milestone_id) — supports reverse-lookup of all stories assigned to
    # a milestone, needed once STORY-012 introduces milestone management.
    op.create_index(
        "ix_story_milestone_id",
        "story",
        ["milestone_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_story_milestone_id", table_name="story")
    op.drop_index("ix_story_project_status", table_name="story")
    op.drop_index("ix_story_project_created_at", table_name="story")
    op.drop_table("story")

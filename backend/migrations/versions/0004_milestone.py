"""Create milestone table and add deferred story.milestone_id FK.

Revision ID: 0004_milestone
Revises: 0003_story
Create Date: 2026-07-10

milestone belongs to exactly one project (ON DELETE CASCADE). The FK toward
project is declared inline because project already exists from 0001_project
(ADR-010 root-first inline-FK rule).

Name uniqueness is case-insensitive within a project, enforced via a
functional LOWER(name) composite unique index on (project_id, LOWER(name)).

After creating the milestone table this revision adds the FK that was
intentionally deferred in 0003_story: story.milestone_id → milestone.id
(ON DELETE SET NULL). SQLite cannot ALTER TABLE ADD CONSTRAINT, so the FK
is added via batch_alter_table which rebuilds the table on SQLite while
emitting a plain ALTER TABLE … ADD CONSTRAINT on PostgreSQL (ADR-013).

No seed data — milestones are user-created and entirely optional.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_milestone"
down_revision: Union[str, None] = "0003_story"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "milestone",
        # id and FK columns use String(36) DDL so the same migration runs on
        # both SQLite (no native UUID type) and PostgreSQL. The UUIDType custom
        # column type in app/core/database/types.py handles dialect-aware
        # conversion at the ORM layer.
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        # status: planned | active | finished — lowercase on the wire per v1.2.
        # Default 'planned' is applied by the service on create; the migration
        # sets the server_default so existing rows (if any) get the right value.
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="planned",
        ),
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

    # Case-insensitive name uniqueness scoped to project_id.
    # A composite functional index on (project_id, LOWER(name)) enforces that
    # no two milestones within the same project share the same name
    # case-insensitively, using the same portable approach as project names.
    op.create_index(
        "ix_milestone_project_name_lower",
        "milestone",
        ["project_id", sa.text("LOWER(name)")],
        unique=True,
    )

    # Index: (project_id) — supports listing all milestones for a project,
    # the primary read pattern for the Milestones tab.
    op.create_index(
        "ix_milestone_project_id",
        "milestone",
        ["project_id"],
    )

    # Index: (project_id, status) — supports filtering milestones by status
    # within a project, e.g. finding the single active milestone.
    op.create_index(
        "ix_milestone_project_status",
        "milestone",
        ["project_id", "status"],
    )

    # Add the deferred story.milestone_id FK now that the milestone table
    # exists. batch_alter_table is portable: on SQLite it rebuilds the table
    # (the only way to add a FK on SQLite), on PostgreSQL it emits a plain
    # ALTER TABLE … ADD CONSTRAINT (ADR-013).
    with op.batch_alter_table("story", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_story_milestone_id",
            "milestone",
            ["milestone_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    # Remove the story → milestone FK first (reverse of upgrade order).
    with op.batch_alter_table("story", schema=None) as batch_op:
        batch_op.drop_constraint("fk_story_milestone_id", type_="foreignkey")

    op.drop_index("ix_milestone_project_status", table_name="milestone")
    op.drop_index("ix_milestone_project_id", table_name="milestone")
    op.drop_index("ix_milestone_project_name_lower", table_name="milestone")
    op.drop_table("milestone")

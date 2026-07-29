"""Create session table.

Revision ID: 0013_session
Revises: 0012_web_ui_role_backfill
Create Date: 2026-07-29

session is a project-owned entity (STORY-009) — the `project_id` FK cascades
on delete, following the root-first inline-FK convention (ADR-010): project,
story, and task all already exist. `linked_story_id`/`linked_task_id` are
optional references that null out (`SET NULL`) when the referenced story/task
is deleted; because SQLite's FK actions are inert unless
`PRAGMA foreign_keys = ON` is set (Known Divergences), the reference-clearing
that the acceptance criteria depend on is additionally done application-side
(STORY-009 TASK-004) so it holds on both dialects — this migration's FK
actions are defence-in-depth for PostgreSQL, not the sole mechanism.

`is_complete` defaults to `false` at the DDL layer — every session starts
incomplete and completion is only ever set explicitly via update, never
inferred from the result fields.

No seed data.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_session"
down_revision: Union[str, None] = "0012_web_ui_role_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "session",
        # id and FK columns use String(36) DDL so the migration runs on both
        # SQLite and PostgreSQL without dialect branching (matches UUIDType).
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("topic", sa.String(500), nullable=False),
        sa.Column("goal", sa.String(500), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("status", sa.String(200), nullable=True),
        sa.Column("participant_role", sa.String(200), nullable=False),
        sa.Column("result_decisions", sa.Text(), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column(
            "is_complete",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("linked_story_id", sa.String(36), nullable=True),
        sa.Column("linked_task_id", sa.String(36), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK to project — valid because project already exists
        # from 0001_project.
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            ondelete="CASCADE",
        ),
        # Inline FK to story — valid because story already exists from
        # 0003_story. SET NULL on delete (defence-in-depth; see docstring).
        sa.ForeignKeyConstraint(
            ["linked_story_id"],
            ["story.id"],
            ondelete="SET NULL",
        ),
        # Inline FK to task — valid because task already exists from
        # 0005_task. SET NULL on delete (defence-in-depth; see docstring).
        sa.ForeignKeyConstraint(
            ["linked_task_id"],
            ["task.id"],
            ondelete="SET NULL",
        ),
    )

    # Index: (project_id, created_at) — backs the project-scoped
    # newest-first default list.
    op.create_index(
        "ix_session_project_created",
        "session",
        ["project_id", "created_at"],
    )

    # Index: (project_id, is_complete) — backs the project-scoped
    # incomplete query.
    op.create_index(
        "ix_session_project_complete",
        "session",
        ["project_id", "is_complete"],
    )

    # Index: (linked_story_id) — backs the linked-story list filter and the
    # reference-clearing update on story delete.
    op.create_index(
        "ix_session_linked_story",
        "session",
        ["linked_story_id"],
    )

    # Index: (linked_task_id) — backs the reference-clearing update on task
    # delete (no list filter yet — a future addition anticipated by the plan).
    op.create_index(
        "ix_session_linked_task",
        "session",
        ["linked_task_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_session_linked_task", table_name="session")
    op.drop_index("ix_session_linked_story", table_name="session")
    op.drop_index("ix_session_project_complete", table_name="session")
    op.drop_index("ix_session_project_created", table_name="session")
    op.drop_table("session")

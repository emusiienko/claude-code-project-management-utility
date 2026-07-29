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

`status` is a mandatory fixed 3-value lifecycle enum (`pending` /
`in-progress` / `finished`), defaulting to `pending` at the DDL layer — every
session starts `pending` and moves through the lifecycle only via explicit
update, never inferred from the result fields. It is deliberately not
dictionary-validated, unlike `task_statuses`/`story_statuses`.

STORY-009 TASK-008 (2026-07-29, amended in place — see that story's Revision 2
implementation plan): this migration originally created an `is_complete`
boolean column instead of `status`. Because the `session` table exists only on
this unmerged feature branch (no released/production database has it), the
revision was edited in place rather than superseded by a new one, per this
project's established pre-production in-place-edit convention. A local dev DB
that already applied the old `0013` must be recreated (fresh volume, or
downgrade-then-upgrade).

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
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("participant_role", sa.String(200), nullable=False),
        sa.Column("result_decisions", sa.Text(), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
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

    # Index: (project_id, status) — backs the project-scoped incomplete
    # query (status != finished).
    op.create_index(
        "ix_session_project_status",
        "session",
        ["project_id", "status"],
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
    op.drop_index("ix_session_project_status", table_name="session")
    op.drop_index("ix_session_project_created", table_name="session")
    op.drop_table("session")

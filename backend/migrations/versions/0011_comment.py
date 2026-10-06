"""Create comment table.

Revision ID: 0011_comment
Revises: 0010_attachment_title
Create Date: 2026-07-20

comment belongs to exactly one container — a story, task or milestone —
through three nullable keys, `story_id`, `task_id` and `milestone_id`, each an
`ON DELETE CASCADE` FK, with a CHECK that exactly one is set (STORY-016 /
ADR-034), mirroring attachment (0009_attachment). The database removes the
rows when any container is deleted.

STORY-016 folded these keys into this revision, which originally carried no
container foreign keys. A database created from the earlier version must be
wiped before upgrading.

`ancestors` is an ordered (root-first) JSON array of ancestor comment ids —
the persisted materialized path backing replies (STORY-008 implementation
plan, superseding the spec's schema-free prepend-to-content mechanism). It is
FK-less — one column cannot reference a JSON array of ids — so referential
integrity of ancestor ids is not DB-enforced: a reference to a later-deleted
ancestor lingers benignly and readers degrade gracefully.

No seed data.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_comment"
down_revision: Union[str, None] = "0010_attachment_title"
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
    return f"ix_comment_{column.removesuffix('_id')}_created"


def upgrade() -> None:
    op.create_table(
        "comment",
        # String(36) DDL so the migration runs on both SQLite and PostgreSQL
        # without dialect branching (matches UUIDType).
        sa.Column("id", sa.String(36), primary_key=True),
        *(
            sa.Column(
                column,
                sa.String(36),
                sa.ForeignKey(
                    f"{parent}.id",
                    name=f"fk_comment_{column}",
                    ondelete="CASCADE",
                ),
                nullable=True,
            )
            for column, parent in _CONTAINER_TABLES.items()
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author_role", sa.String(200), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("ancestors", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(_ONE_CONTAINER_CHECK, name="ck_comment_one_container"),
    )

    # Back chronological (oldest-first) listing per container — the primary
    # read pattern for the Comments section on every host screen.
    for column in _CONTAINER_TABLES:
        op.create_index(_index_name(column), "comment", [column, "created_at"])


def downgrade() -> None:
    for column in _CONTAINER_TABLES:
        op.drop_index(_index_name(column), table_name="comment")
    op.drop_table("comment")

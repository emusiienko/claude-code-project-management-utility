"""Create comment table.

Revision ID: 0011_comment
Revises: 0010_attachment_title
Create Date: 2026-07-20

comment is a polymorphic association across story/task/milestone via a
(container_type, container_id) pair, mirroring the attachment container
convention (0009_attachment) — container_id carries NO foreign key, since one
column cannot reference three different tables; container existence is
validated in the service layer, and container-delete cascade is
application-level (STORY-008 plan).

`ancestors` is an ordered (root-first) JSON array of ancestor comment ids —
the persisted materialized path backing replies (STORY-008 implementation
plan, superseding the spec's schema-free prepend-to-content mechanism). It is
FK-less for the same reason as container_id: referential integrity of
ancestor ids is not DB-enforced, so a reference to a later-deleted ancestor
lingers benignly and readers degrade gracefully.

No seed data.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_comment"
down_revision: Union[str, None] = "0010_attachment_title"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comment",
        # id and container_id use String(36) DDL so the migration runs on both
        # SQLite and PostgreSQL without dialect branching (matches UUIDType).
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("container_type", sa.String(20), nullable=False),
        sa.Column("container_id", sa.String(36), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author_role", sa.String(200), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("ancestors", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # No ForeignKeyConstraint on container_id — polymorphic reference.
    )

    # Backs chronological (oldest-first) listing per container — the primary
    # read pattern for the Comments section on every host screen.
    op.create_index(
        "ix_comment_container_created",
        "comment",
        ["container_type", "container_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_comment_container_created", table_name="comment")
    op.drop_table("comment")
